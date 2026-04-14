import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, ComponentType, EmbedBuilder, Guild, GuildChannelManager, GuildMember, Message, MessageFlags, OverwriteType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction, VoiceChannel, VoiceState } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { awaitAuthorizedComponentInteraction } from '../utils/discord/interactions.js';
import { DISCORD_MAX_CHANNEL_NAME_LENGTH, DISCORD_SELECT_MENU_MAX_VALUES, INTERACTION_TIMEOUT_MS } from '../utils/constants.js';
import AsyncLock from 'async-lock';

/** Handles all voice state changes (joins, leaves, channel switches) to manage temporary voice channels. */
export default class VoiceStateUpdateEvent extends BaseEvent<'voiceStateUpdate'> {
	public readonly name = 'voiceStateUpdate';
	public once = false;
	private lock = new AsyncLock();

	/**
	 * Entry point for voice state changes. Acquires a per-channel lock to prevent race conditions,
	 * then delegates to join/leave handlers if the member actually changed channels.
	 * @param client - The bot client instance.
	 * @param oldState - The member's voice state before the change.
	 * @param newState - The member's voice state after the change.
	 */
	public async execute(client: ShiveronClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
		const channelId = newState.channelId || oldState.channelId;

		if (channelId && oldState.channelId != newState.channelId) {
			await this.lock.acquire(channelId, async () => {
				try {
					const currentGuildOld = await client.guildSettingsService.createOrGetGuildSettings(oldState.guild.id);
					const currentGuildNew = await client.guildSettingsService.createOrGetGuildSettings(newState.guild.id);

					if (currentGuildNew.tempChannelId) {
						const t = (path: string, vars: Record<string, any> = {}) => client.i18n.translate(currentGuildNew.lang, path, vars);
						await this.processVoiceChannelJoin(client, t, newState, currentGuildNew);
					}
					if (currentGuildOld.tempChannelId) {
						const t = (path: string, vars: Record<string, any> = {}) => client.i18n.translate(currentGuildOld.lang, path, vars);
						await this.processVoiceChannelLeave(client, t, oldState, currentGuildOld);
					}
				}
				catch (error) {
					client.logger.error(`Failed to process ${this.name} : ${error}`);
				}
			}).catch(error => client.logger.error(`Lock Error : ${error}`));
		}
	}

	/**
	 * Handles a member joining a voice channel. Creates a new temp channel if they joined the trigger channel,
	 * or adds them to the successor list if they joined an existing temp channel.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param newState - The member's new voice state (channel they joined).
	 * @param currentGuildNew - The guild settings, used to identify the temp channel trigger.
	 */
	private async processVoiceChannelJoin(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, newState: VoiceState, currentGuildNew: GuildSettings): Promise<void> {
		if (newState.member && newState.channelId) {
			if (newState.channelId == currentGuildNew.tempChannelId) {
				try {
					const newChannelId = await this.createTempChannel(client, t, newState);
					client.logger.debug(`Created a new temporary voice channel ${newChannelId} in guild ${newState.guild.id} for user ${newState.member.id}`);
				}
				catch (error) {
					client.logger.error('An error occured while creating a new temporary voice channel');
					throw error;
				}
			}
			else {
				const tempVoice = await client.voiceService.findTempVoiceInGuild(newState.guild.id, newState.channelId);
				if (tempVoice && newState.member.id != tempVoice.ownerId) {
					tempVoice.successorIds.push(newState.member.id);
					client.voiceService.updateTempVoice({
						guildId: tempVoice.guildId,
						ownerId: tempVoice.ownerId,
						successorIds: tempVoice.successorIds,
					});
					client.logger.debug(`Added user ${newState.member.id} to the successor list of channel ${newState.channelId} in guild ${newState.guild.id}`);
				}
			}
		}
	}

	/**
	 * Creates a new temporary voice channel for the joining member, applying their saved settings and ACL.
	 * Sends the channel control message and sets up the message deletion and control collectors.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param newState - The member's new voice state, used to get the guild and member.
	 * @returns The ID of the newly created voice channel.
	 */
	private async createTempChannel(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, newState: VoiceState): Promise<string> {
		const { tempVoice, voiceACL, created } = await client.voiceService.createOrGetTempVoice(newState.guild.id, newState.member!);

		const newChannel = await newState.guild.channels.create({
			name: tempVoice.channelName,
			parent: newState.channel!.parentId,
			type: ChannelType.GuildVoice,
			permissionOverwrites: this.buildUserVoicePermissions(newState.member!.id, newState.guild.roles.everyone.id, tempVoice, voiceACL),
		});

		newState.channel?.permissionOverwrites.create(newState.member!, {
			Connect: false,
		});

		newState.setChannel(newChannel);

		const { menuText, menuEmbed, menuRow } = await this.createChannelControlMessage(t, newState.member!, newState.guild, created, tempVoice, voiceACL, newChannel);

		const channelControlMessage = await newChannel.send({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		client.voiceService.updateTempVoice({
			guildId: newState.guild.id,
			ownerId: newState.member!.id,
			channelId: newChannel.id,
			channelControlMessageId: channelControlMessage.id,
		});

		this.createAutoMessageDeletion(client, newChannel, channelControlMessage.id, tempVoice.messagesToKeep);
		this.attachControlCollector(client, t, channelControlMessage, newState.member!, newChannel);

		return newChannel.id;
	}

	/**
	 * Builds the channel control message content: a status embed and a select menu for channel options.
	 * Shows whitelist or blacklist fields based on channel visibility, and reflects current vs. saved settings.
	 * @param t - Translation function for the guild's locale.
	 * @param owner - The GuildMember who owns this temp channel.
	 * @param guild - The guild the channel belongs to.
	 * @param firstVoiceChannel - `true` if this is the owner's first-ever temp channel (shows a welcome message).
	 * @param tempVoice - The saved TempVoice settings for this owner.
	 * @param voiceACL - The list of ACL entries (whitelist/blacklist) for this owner's channel.
	 * @param newChannel - The live VoiceChannel instance, used to read current permission overrides.
	 * @returns An object with `menuText`, `menuEmbed`, and `menuRow`.
	 */
	private async createChannelControlMessage(t: (path: string, vars?: Record<string, any>) => string, owner: GuildMember, guild: Guild, firstVoiceChannel: boolean, tempVoice: TempVoice, voiceACL: VoiceACL[], newChannel: VoiceChannel): Promise<{ menuText: string; menuEmbed: EmbedBuilder; menuRow: ActionRowBuilder<StringSelectMenuBuilder> }> {
		const menuText = firstVoiceChannel ? t('temp_voice.control_message.first_channel', { user: owner }) : '';

		const soundBoardEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);
		let soundboardStatus;
		if (tempVoice.soundBoardEnabled == soundBoardEnabledTemporarily) {
			soundboardStatus = soundBoardEnabledTemporarily ? t('temp_voice.control_message.enabled') : t('temp_voice.control_message.disabled');
		}
		else {
			soundboardStatus = soundBoardEnabledTemporarily ? t('temp_voice.control_message.enabled_temp') : t('temp_voice.control_message.disabled_temp');
		}

		const streamsEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Stream);
		let streamsStatus;
		if (tempVoice.streamsEnabled == streamsEnabledTemporarily) {
			streamsStatus = streamsEnabledTemporarily ? t('temp_voice.control_message.enabled') : t('temp_voice.control_message.disabled');
		}
		else {
			streamsStatus = streamsEnabledTemporarily ? t('temp_voice.control_message.enabled_temp') : t('temp_voice.control_message.disabled_temp');
		}

		const activitiesEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);
		let activitiesStatus;
		if (tempVoice.activitiesEnabled == activitiesEnabledTemporarily) {
			activitiesStatus = activitiesEnabledTemporarily ? t('temp_voice.control_message.enabled') : t('temp_voice.control_message.disabled');
		}
		else {
			activitiesStatus = activitiesEnabledTemporarily ? t('temp_voice.control_message.enabled_temp') : t('temp_voice.control_message.disabled_temp');
		}

		const privateChannelTemporarily = !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Connect);
		let privateChannelStatus;
		if (tempVoice.privateChannel == privateChannelTemporarily) {
			privateChannelStatus = privateChannelTemporarily ? t('temp_voice.control_message.private') : t('temp_voice.control_message.public');
		}
		else {
			privateChannelStatus = privateChannelTemporarily ? t('temp_voice.control_message.private_temp') : t('temp_voice.control_message.public_temp');
		}

		let messagesToKeepStatus;
		if (tempVoice.messagesToKeep) {
			messagesToKeepStatus = '```' + tempVoice.messagesToKeep + '```';
		}
		else {
			messagesToKeepStatus = t('temp_voice.control_message.none');
		}

		const menuEmbed = new EmbedBuilder()
			.setTitle(t('temp_voice.control_message.embed.title'))
			.setDescription(t('temp_voice.control_message.embed.description'))
			.setColor('#46d8ef')
			.addFields(
				{
					name: t('temp_voice.control_message.embed.fields.soundboards'),
					value: soundboardStatus,
					inline: true,
				},
				{
					name: t('temp_voice.control_message.embed.fields.streams'),
					value: streamsStatus,
					inline: true,
				},
				{
					name: t('temp_voice.control_message.embed.fields.activities'),
					value: activitiesStatus,
					inline: true,
				},
				{
					name: t('temp_voice.control_message.embed.fields.availability'),
					value: privateChannelStatus,
					inline: true,
				},
				{
					name: t('temp_voice.control_message.embed.fields.messages_kept'),
					value: messagesToKeepStatus,
					inline: true,
				},
			)
			.setFooter({ text: t('temp_voice.control_message.embed.footer', { user: owner.displayName }), iconURL: owner.displayAvatarURL() });

		const whitelistedMembers = [];
		const blacklistedMembers = [];

		for (const entry of voiceACL) {
			if (entry.hasAccess) {
				whitelistedMembers.push(`<@${entry.memberId}>`);
			}
			else {
				blacklistedMembers.push(`<@${entry.memberId}>`);
			}
		}

		const menuSelect = new StringSelectMenuBuilder()
			.setCustomId('vc_controls')
			.setPlaceholder(t('misc.generic_selection'))
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.name.label'))
					.setDescription(t('temp_voice.control_message.select_menu.name.description'))
					.setValue('name_change')
					.setEmoji('✒️'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.soundboards.label'))
					.setDescription(t('temp_voice.control_message.select_menu.soundboards.description'))
					.setValue('soundboard_toggle')
					.setEmoji('📣'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.streams.label'))
					.setDescription(t('temp_voice.control_message.select_menu.streams.description'))
					.setValue('stream_toggle')
					.setEmoji('🎥'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.activities.label'))
					.setDescription(t('temp_voice.control_message.select_menu.activities.description'))
					.setValue('activities_toggle')
					.setEmoji('🎮'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.availability.label'))
					.setDescription(t('temp_voice.control_message.select_menu.availability.description'))
					.setValue('private_channel')
					.setEmoji('👥'),
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.messages_kept.label'))
					.setDescription(t('temp_voice.control_message.select_menu.messages_kept.description'))
					.setValue('messages_deletion')
					.setEmoji('💬'),
			);

		if (privateChannelTemporarily) {
			if (whitelistedMembers.length > 0) {
				menuEmbed.addFields({
					name: t('temp_voice.control_message.embed.fields.whitelist'),
					value: whitelistedMembers.join(' | '),
					inline: false,
				});
			}

			menuSelect.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.whitelist.label'))
					.setDescription(t('temp_voice.control_message.select_menu.whitelist.description'))
					.setValue('whitelist')
					.setEmoji('✅'),
			);
		}
		else {
			if (blacklistedMembers.length > 0) {
				menuEmbed.addFields({
					name: t('temp_voice.control_message.embed.fields.blacklist'),
					value: blacklistedMembers.join(' | '),
					inline: false,
				});
			}

			menuSelect.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel(t('temp_voice.control_message.select_menu.blacklist.label'))
					.setDescription(t('temp_voice.control_message.select_menu.blacklist.description'))
					.setValue('blacklist')
					.setEmoji('🚫'),
			);
		}

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(menuSelect);

		return { menuText, menuEmbed, menuRow };
	}

	/**
	 * Attaches a string select menu collector to the channel control message.
	 * Dispatches each selection to the appropriate process method and refreshes the control message afterward.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param message - The channel control message to attach the collector to.
	 * @param channelOwner - The GuildMember who owns this temp channel; only they may interact.
	 * @param newChannel - The live VoiceChannel instance, passed to process methods that need it.
	 */
	private async attachControlCollector(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, message: Message, channelOwner: GuildMember, newChannel: VoiceChannel): Promise<void> {
		const channelControlCollector = message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: i => i.user.id == channelOwner.id,
		});

		channelControlCollector.on('ignore', async interaction => {
			interaction.reply({ content: t('misc.interaction_forbidden', { user: interaction.user }), flags: MessageFlags.Ephemeral });
		});

		channelControlCollector.on('collect', async interaction => {
			channelControlCollector.stop('refresh');

			if (interaction.values.length > 0) {
				await interaction.deferReply();

				switch (interaction.values[0]) {
				case 'name_change': {
					await this.processNameChange(client, interaction, t, channelOwner.id);
					break;
				}
				case 'soundboard_toggle': {
					await this.processSoundboardToggle(client, interaction, t, channelOwner.id);
					break;
				}
				case 'stream_toggle': {
					await this.processStreamToggle(client, interaction, t, channelOwner.id);
					break;
				}
				case 'activities_toggle': {
					await this.processActivitiesToggle(client, interaction, t, channelOwner.id);
					break;
				}
				case 'private_channel': {
					await this.processPrivateChannel(client, interaction, t, channelOwner.id);
					break;
				}
				case 'blacklist': {
					await this.processACL(client, interaction, t, channelOwner.id, true);
					break;
				}
				case 'whitelist': {
					await this.processACL(client, interaction, t, channelOwner.id, false);
					break;
				}
				case 'messages_deletion': {
					await this.processMessageDeletion(client, interaction, t, channelOwner.id);
					break;
				}
				}

				this.refreshChannelControls(client, t, interaction, channelOwner, newChannel);
			}
		});

		client.voiceCollectorManager.addChannelControlsCollector(newChannel.id, channelControlCollector);
	}

	/**
	 * Sets up a message collector that automatically deletes older messages in the channel
	 * whenever a new one arrives, keeping at most `messagesToKeep` non-control messages.
	 * @param client - The bot client, used to register the collector in VoiceCollectorManager.
	 * @param channel - The voice channel to watch for new messages.
	 * @param channelControlMessageId - The ID of the pinned control message, excluded from deletion.
	 * @param messagesToKeep - Maximum number of regular messages to retain; pass `null` to disable auto-deletion.
	 */
	private async createAutoMessageDeletion(client: ShiveronClient, channel: VoiceChannel, channelControlMessageId: String, messagesToKeep: number | null): Promise<void> {
		const messageCollector = channel.createMessageCollector({
			filter: message => message.id != channelControlMessageId,
		});

		if (messagesToKeep) {
			messageCollector.on('collect', async () => {
				const messages = await channel.messages.fetch({ limit: messagesToKeep + 1 });

				const sortedMessages = messages
					.filter(message => message.id != channelControlMessageId)
					.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

				if (sortedMessages.size > messagesToKeep) {
					const toDelete = new Collection(sortedMessages.first(sortedMessages.size - messagesToKeep).map(m => [m.id, m]));

					const [bulkDeletableMessages, notBulkDeletableMessages] = toDelete.partition(message => message.bulkDeletable);

					for (const message of notBulkDeletableMessages) {
						if (message instanceof Message) {
							message.delete();
						}
					}
					channel.bulkDelete(bulkDeletableMessages);
				}
			});
		}

		client.voiceCollectorManager.addMessageCollector(channel.id, messageCollector);
	}

	/**
	 * Adds thumbs-up / thumbs-down buttons to a message and waits for the owner to choose
	 * whether to save a setting as the new default for future channels.
	 * @param t - Translation function for the guild's locale.
	 * @param message - The message to append the buttons to.
	 * @param targetId - The Discord user ID of the channel owner; only they may press the buttons.
	 * @returns `true` if the user confirmed saving as default, `false` otherwise (including timeout).
	 */
	private async createSetAsDefaultQuestion(t: (path: string, vars?: Record<string, any>) => string, message: Message, targetId: string): Promise<boolean> {
		const enable = new ButtonBuilder()
			.setCustomId('enable')
			.setEmoji('👍')
			.setStyle(ButtonStyle.Success);
		const disable = new ButtonBuilder()
			.setCustomId('disable')
			.setEmoji('👎')
			.setStyle(ButtonStyle.Danger);
		const buttonsRow = new ActionRowBuilder<ButtonBuilder>()
			.addComponents([enable, disable]);

		message.edit({ components: [buttonsRow] });

		const buttonPressed = await awaitAuthorizedComponentInteraction(message, targetId, ComponentType.Button);

		if (!buttonPressed) {
			message.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			return false;
		}
		else {
			await buttonPressed.deferReply();
			if (buttonPressed.customId == 'enable') {
				buttonPressed.editReply({ content: t('temp_voice.process.set_default.success_update') });
				return true;
			}
			else {
				buttonPressed.editReply({ content: t('temp_voice.process.set_default.success_not_update') });
				return false;
			}
		}
	}

	/**
	 * Prompts the owner to type a new name for their voice channel, applies it, and optionally saves it as default.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner; used to filter awaited messages.
	 */
	private async processNameChange(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const nameMessage = await interaction.editReply({ content: t('temp_voice.process.name.query_name') });

			const collectedMessages = await channel.awaitMessages({
				time: INTERACTION_TIMEOUT_MS,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				nameMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content.length >= DISCORD_MAX_CHANNEL_NAME_LENGTH) {
					answer.reply({ content: t('temp_voice.process.name.error_length') });
				}
				else {
					channel.setName(answer.content).catch(() => {
						client.logger.warn('Couldn\'t change the name of a voice channel');
					});

					const setAsDefaultQuestion = await answer.reply({ content: t('temp_voice.process.name.success', { name: answer.content }) });

					const answerSetAsDefault = await this.createSetAsDefaultQuestion(t, setAsDefaultQuestion, channelOwnerId);

					if (answerSetAsDefault) {
						client.voiceService.updateTempVoice({
							guildId: channel.guild.id,
							ownerId: channelOwnerId,
							channelName: answer.content,
						});
					}
				}
			}
		}
	}

	/**
	 * Toggles soundboard usage in the channel and optionally saves the new state as default.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner.
	 */
	private async processSoundboardToggle(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const soundBoardEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseSoundboard: !soundBoardEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: t(!soundBoardEnabled ? 'temp_voice.process.soundboards.success_enable' : 'temp_voice.process.soundboards.success_disable', { channel }) });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(t, setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				client.voiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					soundBoardEnabled: !soundBoardEnabled,
				});
			}
		}
	}

	/**
	 * Toggles video streaming in the channel and optionally saves the new state as default.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner.
	 */
	private async processStreamToggle(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const streamsEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Stream);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				Stream : !streamsEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: t(!streamsEnabled ? 'temp_voice.process.streams.success_enable' : 'temp_voice.process.streams.success_disable', { channel }) });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(t, setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				client.voiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					streamsEnabled: !streamsEnabled,
				});
			}
		}
	}

	/**
	 * Toggles embedded activities (e.g., Watch Together) in the channel and optionally saves the new state as default.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner.
	 */
	private async processActivitiesToggle(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const activitiesEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseEmbeddedActivities : !activitiesEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: t(!activitiesEnabled ? 'temp_voice.process.activities.success_enable' : 'temp_voice.process.activities.success_disable', { channel }) });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(t, setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				client.voiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					activitiesEnabled: !activitiesEnabled,
				});
			}
		}
	}

	/**
	 * Toggles the channel between public and private (hides it from @everyone if private)
	 * and optionally saves the new state as default.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner.
	 */
	private async processPrivateChannel(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string,  channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const isPrivateChannel = !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Connect);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				ViewChannel: isPrivateChannel,
				Connect: isPrivateChannel,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: t(!isPrivateChannel ? 'temp_voice.process.availability.success_private' : 'temp_voice.process.availability.success_public', { channel }) });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(t, setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				client.voiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					privateChannel: !isPrivateChannel,
				});
			}
		}
	}

	/**
	 * Prompts the owner to set a new message retention limit (or type `"none"` to disable auto-deletion)
	 * and saves the setting to the database.
	 * @param client - The bot client instance, used to update TempVoice settings.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner; used to filter awaited messages.
	 */
	private async processMessageDeletion(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const amountMessage = await interaction.editReply({ content: t('temp_voice.process.messages_kept.query_amount') });

			const collectedMessages = await channel.awaitMessages({
				time: INTERACTION_TIMEOUT_MS,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				amountMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content == 'none') {
					await client.voiceService.updateTempVoice({
						guildId: channel.guildId,
						ownerId: channelOwnerId,
						messagesToKeep: null,
					});

					amountMessage.reply({ content: t('temp_voice.process.messages_kept.success_disable') });
				}
				else if (!isNaN(Number(answer.content))) {
					await client.voiceService.updateTempVoice({
						guildId: channel.guildId,
						ownerId: channelOwnerId,
						messagesToKeep: parseInt(answer.content),
					});

					amountMessage.reply({ content: t('temp_voice.process.messages_kept.success', { amount: answer.content }) });
				}
				else {
					amountMessage.reply({ content: t('temp_voice.process.messages_kept.error_value') });
				}
			}
		}
	}

	/**
	 * Presents a user select menu to add/remove members from the channel's whitelist or blacklist.
	 * Toggling an already-listed member removes them; otherwise adds them with the corresponding permission override.
	 * @param client - The bot client instance, used to update VoiceACL records.
	 * @param interaction - The select menu interaction that triggered this action.
	 * @param t - Translation function for the guild's locale.
	 * @param channelOwnerId - The Discord user ID of the channel owner; used to restrict interaction access.
	 * @param blacklist - `true` to manage the blacklist (deny access), `false` to manage the whitelist (grant access).
	 */
	private async processACL(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string, blacklist: boolean): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const memberSelect = new UserSelectMenuBuilder()
				.setCustomId('blacklist')
				.setPlaceholder(t('misc.user_selection'))
				.setMinValues(1)
				.setMaxValues(DISCORD_SELECT_MENU_MAX_VALUES);
			const rowSelection = new ActionRowBuilder<UserSelectMenuBuilder>()
				.addComponents(memberSelect);

			const selectionMessage = await interaction.editReply({ content: t(blacklist ? 'temp_voice.process.blacklist.query_users' : 'temp_voice.process.whitelist.query_users', { channel }), components: [rowSelection] });

			const selectedUsers = await awaitAuthorizedComponentInteraction(selectionMessage, channelOwnerId, ComponentType.UserSelect) as UserSelectMenuInteraction;

			if (!selectedUsers) {
				selectionMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				await selectedUsers.deferReply();
				let response = '';

				const voiceACL = await client.voiceService.getVoiceACLForTempVoice(interaction.guildId!, channelOwnerId);

				for (const userId of selectedUsers.values) {
					const user = await channel.guild.members.fetch(userId);
					const existingEntry = voiceACL.find(entry => entry.memberId == userId);
					const isOnTargetList = existingEntry && existingEntry.hasAccess == !blacklist;

					if (blacklist) {
						if (isOnTargetList) {
							channel.permissionOverwrites.delete(userId);
							response += t('temp_voice.process.blacklist.success_remove', { user });
							client.voiceService.deleteVoiceACL(channel.guild.id, channelOwnerId, user.id);
						}
						else {
							channel.permissionOverwrites.edit(user, {
								ViewChannel: false,
								Connect: false,
							});
							response += t('temp_voice.process.blacklist.success_add', { user });
							client.voiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwnerId, user.id, false);
						}
					}
					else if (isOnTargetList) {
						channel.permissionOverwrites.delete(userId);
						response += t('temp_voice.process.whitelist.success_remove', { user });
						client.voiceService.deleteVoiceACL(channel.guild.id, channelOwnerId, user.id);
					}
					else {
						channel.permissionOverwrites.edit(user, {
							ViewChannel: true,
							Connect: true,
						});
						response += t('temp_voice.process.whitelist.success_add', { user });
						client.voiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwnerId, user.id, true);
					}
				}

				selectedUsers.editReply({ content: response });
			}
		}
	}

	/**
	 * Handles a member leaving a voice channel. Deletes the temp channel if empty,
	 * transfers ownership if the owner left while others remain, or removes the member from the successor list.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param oldState - The member's old voice state (channel they left).
	 * @param currentGuildOld - The guild settings for the guild of the channel that was left.
	 */
	private async processVoiceChannelLeave(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, oldState: VoiceState, currentGuildOld: GuildSettings): Promise<void> {
		if (oldState.member && oldState.channel instanceof VoiceChannel) {
			const tempVoice = await client.voiceService.getTempVoiceByChannelId(oldState.channelId!);
			if (tempVoice) {
				if (oldState.channel.members.size == 0) {
					try {
						this.deleteTempChannel(client, oldState.guild.id, oldState.guild.channels, oldState.member.id, oldState.channel, currentGuildOld.tempChannelId!);
						client.logger.debug(`Deleted a temporary voice channel ${oldState.channel.id} in guild ${oldState.guild.id}`);
					}
					catch (error) {
						client.logger.error('An error occured while deleting a temporary voice channel');
						throw error;
					}
				}
				else if (oldState.member.id == tempVoice.ownerId) {
					try {
						const newOwnerId = await this.changeTempChannelOwner(client, t, oldState.guild, tempVoice.ownerId, tempVoice.successorIds, currentGuildOld.tempChannelId!, oldState.channel, tempVoice.channelControlMessageId!);
						client.logger.debug(`Transferred ownership of a temporary voice channel ${oldState.channel.id} in guild ${oldState.guild.id} from ${tempVoice.ownerId} to ${newOwnerId}`);
					}
					catch (error) {
						client.logger.error('An error occured while transfering ownership of a temporary voice channel');
						throw error;
					}
				}
				else {
					const index = tempVoice.successorIds.indexOf(oldState.member.id);
					if (index != -1) {
						tempVoice.successorIds.splice(index, 1);
						client.voiceService.updateTempVoice({
							guildId: tempVoice.guildId,
							ownerId: tempVoice.ownerId,
							successorIds: tempVoice.successorIds,
						});
						client.logger.debug(`Removed user ${oldState.member.id} from the successor list of channel ${oldState.channelId} in guild ${oldState.guild.id}`);
					}
				}
			}
		}
	}

	/**
	 * Deletes the Discord voice channel and cleans up the associated database state.
	 * @param client - The bot client instance.
	 * @param guildId - The Discord guild ID.
	 * @param channels - The guild's channel manager, used to remove the owner's permission override from the trigger channel.
	 * @param ownerId - The Discord user ID of the channel owner.
	 * @param tempChannel - The VoiceChannel to delete.
	 * @param createTempChannelId - The ID of the trigger channel, used to remove the owner's Connect deny override.
	 */
	private async deleteTempChannel(client: ShiveronClient, guildId: string, channels: GuildChannelManager, ownerId: string, tempChannel: VoiceChannel, createTempChannelId: string): Promise<void> {
		tempChannel.delete();

		this.cleanupTempChannel(client, guildId, ownerId, channels, createTempChannelId);
	}

	/**
	 * Transfers ownership of a temp channel to the next person in the successor list (or the first member in the channel).
	 * Applies the new owner's saved settings, updates the control message, and sets up fresh collectors.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param guild - The guild the channel belongs to.
	 * @param oldOwnerId - The Discord user ID of the departing owner.
	 * @param successorIds - The ordered list of successor user IDs; first entry becomes the new owner.
	 * @param createTempChannelId - The ID of the trigger channel, used to update the new owner's Connect override.
	 * @param channel - The live VoiceChannel instance being transferred.
	 * @param channelControlMessageId - The ID of the pinned control message to update.
	 * @returns The Discord user ID of the new owner.
	 */
	private async changeTempChannelOwner(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, guild: Guild, oldOwnerId: string, successorIds: string[], createTempChannelId: string, channel: VoiceChannel, channelControlMessageId: string): Promise<string> {
		let newOwnerId = successorIds[0];

		this.cleanupTempChannel(client, guild.id, oldOwnerId, guild.channels, createTempChannelId);

		let newOwner: GuildMember;
		if (newOwnerId != undefined) {
			newOwner = await guild.members.fetch(newOwnerId);
		}
		else {
			newOwner = channel.members.first()!;
			newOwnerId = newOwner.id;
		}


		const { tempVoice, voiceACL, created } = await client.voiceService.createOrGetTempVoice(guild.id, newOwner);

		channel.setName(tempVoice.channelName).catch(() => {
			client.logger.warn('Couldn\'t change the name of a voice channel');
		});;
		await channel.permissionOverwrites.set(this.buildUserVoicePermissions(newOwnerId, guild.roles.everyone.id, tempVoice, voiceACL));

		const createTempChannel = await guild.channels.fetch(createTempChannelId);

		if (createTempChannel instanceof VoiceChannel) {
			createTempChannel.permissionOverwrites.create(newOwner, {
				Connect: false,
			});
		}

		const { menuText, menuEmbed, menuRow } = await this.createChannelControlMessage(t, newOwner, guild, created, tempVoice, voiceACL, channel);

		const channelControlMessage = await channel.messages.fetch(channelControlMessageId);

		channelControlMessage.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		client.voiceService.updateTempVoice({
			guildId: guild.id,
			ownerId: newOwnerId,
			channelId: channel.id,
			channelControlMessageId: channelControlMessageId,
			successorIds: successorIds.slice(1),
		});

		this.createAutoMessageDeletion(client, channel, channelControlMessage.id, tempVoice.messagesToKeep);
		this.attachControlCollector(client, t, channelControlMessage, newOwner, channel);

		channel.send({ content: t('temp_voice.owner_change', { user: newOwner }) });

		return newOwnerId;
	}

	/**
	 * Resets the database state for a temp channel (clears channelId, successor list, etc.)
	 * and removes the owner's Connect deny override from the trigger channel.
	 * @param client - The bot client instance.
	 * @param guildId - The Discord guild ID.
	 * @param ownerId - The Discord user ID of the channel owner whose state should be cleared.
	 * @param channels - The guild's channel manager, used to fetch and modify the trigger channel.
	 * @param createTempChannelId - The ID of the trigger channel, used to remove the owner's permission override.
	 */
	private async cleanupTempChannel(client: ShiveronClient, guildId: string, ownerId: string, channels: GuildChannelManager, createTempChannelId: string): Promise<void> {
		client.voiceService.updateTempVoice({
			guildId,
			ownerId,
			channelId: null,
			channelControlMessageId: null,
			successorIds: [],
		});

		const createTempChannel = await channels.fetch(createTempChannelId);

		if (createTempChannel instanceof VoiceChannel) {
			createTempChannel.permissionOverwrites.delete(ownerId);
		}
	}

	/**
	 * Builds the full permission overrides array for a temp voice channel based on the owner's saved settings and ACL.
	 * Grants the owner MoveMembers + full access, applies everyone permissions based on soundboard/stream/activities/private flags,
	 * and adds individual allow/deny entries for each ACL member.
	 * @param ownerId - The Discord user ID of the channel owner.
	 * @param everyoneId - The ID of the guild's @everyone role.
	 * @param tempVoice - The saved TempVoice settings used to determine permission flags.
	 * @param voiceACL - The list of ACL entries for individual member overrides.
	 * @returns An array of permission override objects consumable by discord.js channel creation/update.
	 */
	private buildUserVoicePermissions(ownerId: string, everyoneId: string, tempVoice: TempVoice, voiceACL: VoiceACL[]): {id: string; type: OverwriteType; allow: bigint[]; deny: bigint[]}[] {
		const defaultPermissions: {
			id: string;
			type: OverwriteType;
			allow: bigint[];
			deny: bigint[];
		}[] = [
			{
				id: ownerId,
				type: OverwriteType.Member,
				allow: [
					PermissionFlagsBits.MoveMembers,
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.Connect],
				deny: [],
			},
			{
				id: everyoneId,
				type: OverwriteType.Role,
				allow: [
					PermissionFlagsBits.Speak,
					PermissionFlagsBits.UseExternalSounds,
					PermissionFlagsBits.UseVAD,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.AddReactions,
					PermissionFlagsBits.UseExternalEmojis,
					PermissionFlagsBits.UseExternalStickers,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.SendTTSMessages,
					PermissionFlagsBits.UseApplicationCommands,
					PermissionFlagsBits.SendVoiceMessages,
					PermissionFlagsBits.UseExternalApps],
				deny: [],
			},
		];

		if (!tempVoice.privateChannel) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel);
		}
		else {
			defaultPermissions[1]!.deny.push(PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel);
		}

		if (tempVoice.soundBoardEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.UseSoundboard);
		}
		else {
			defaultPermissions[1]!.deny.push(PermissionFlagsBits.UseSoundboard);
		}

		if (tempVoice.streamsEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.Stream);
		}
		else {
			defaultPermissions[1]!.deny.push(PermissionFlagsBits.Stream);
		}

		if (tempVoice.activitiesEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.UseEmbeddedActivities);
		}
		else {
			defaultPermissions[1]!.deny.push(PermissionFlagsBits.UseEmbeddedActivities);
		}

		if (voiceACL.length != 0) {
			for (const row of voiceACL) {
				if (row.get('hasAccess')) {
					defaultPermissions.push({
						id: row.get('memberId'),
						type: OverwriteType.Member,
						allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
						deny: [],
					});
				}
				else {
					defaultPermissions.push({
						id: row.get('memberId'),
						type: OverwriteType.Member,
						allow: [],
						deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
					});
				}
			}
		}

		return defaultPermissions;
	}

	/**
	 * Rebuilds and edits the channel control message after an option change, then re-attaches the collector.
	 * @param client - The bot client instance.
	 * @param t - Translation function for the guild's locale.
	 * @param interaction - The select menu interaction whose message is updated.
	 * @param channelOwner - The GuildMember who owns the temp channel.
	 * @param channel - The live VoiceChannel instance, used to reflect current permission state.
	 */
	private async refreshChannelControls(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, interaction: StringSelectMenuInteraction, channelOwner: GuildMember, channel: VoiceChannel): Promise<void> {
		const { tempVoice, voiceACL, created } = await client.voiceService.createOrGetTempVoice(interaction.guild!.id, channelOwner);

		const { menuText, menuEmbed, menuRow } = await this.createChannelControlMessage(t, channelOwner, interaction.guild!, created, tempVoice, voiceACL, channel);

		const channelControlMessage = await interaction.message.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		this.createAutoMessageDeletion(client, channel, channelControlMessage.id, tempVoice.messagesToKeep);
		this.attachControlCollector(client, t, channelControlMessage, channelOwner, channel);
	}
}
