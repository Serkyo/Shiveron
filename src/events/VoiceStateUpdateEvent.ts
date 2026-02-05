import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, ComponentType, EmbedBuilder, Guild, GuildChannelManager, GuildMember, Message, MessageFlags, OverwriteType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction, VoiceChannel, VoiceState } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { awaitAuthorizedComponentInteraction } from '../utils/discord/interactions.js';
import AsyncLock from 'async-lock';

export default class VoiceStateUpdateEvent extends BaseEvent<'voiceStateUpdate'> {
	public readonly name = 'voiceStateUpdate';
	public once = false;
	private lock = new AsyncLock();

	public async execute(client: ShiveronClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
		const channelId = newState.channelId || oldState.channelId;

		if (channelId && oldState.channelId != newState.channelId) {
			await this.lock.acquire(channelId, async () => {
				try {
					const [currentGuildOld] = await client.guildSettingsService.createOrGetGuildSettings(oldState.guild.id);
					const [currentGuildNew] = await client.guildSettingsService.createOrGetGuildSettings(newState.guild.id);

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

	private async createTempChannel(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, newState: VoiceState): Promise<string> {
		const [tempVoice, voiceACL, created] = await client.voiceService.createOrGetTempVoice(newState.guild.id, newState.member!);

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

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(t, newState.member!, newState.guild, created, tempVoice, voiceACL, newChannel);

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

	private async createChannelControlMessage(t: (path: string, vars?: Record<string, any>) => string, owner: GuildMember, guild: Guild, firstVoiceChannel: boolean, tempVoice: TempVoice, voiceACL: VoiceACL[], newChannel: VoiceChannel): Promise<[string, EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
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

		return [menuText, menuEmbed, menuRow];
	}

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

	private async processNameChange(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const nameMessage = await interaction.editReply({ content: t('temp_voice.process.name.query_name') });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				nameMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content.length >= 100) {
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

	private async processMessageDeletion(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const amountMessage = await interaction.editReply({ content: t('temp_voice.process.messages_kept.query_amount') });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				amountMessage.reply({ content: t('misc.interaction_expired', { seconds: 60 }) });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content == 'none') {
					client.voiceService.updateTempVoice({
						guildId: channel.guildId,
						ownerId: channelOwnerId,
						messagesToKeep: null,
					});

					amountMessage.reply({ content: t('temp_voice.process.messages_kept.success_disable') });
				}
				else if (!isNaN(Number(answer.content))) {
					client.voiceService.updateTempVoice({
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

	private async processACL(client: ShiveronClient, interaction: StringSelectMenuInteraction, t: (path: string, vars?: Record<string, any>) => string, channelOwnerId: string, blacklist: boolean): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const memberSelect = new UserSelectMenuBuilder()
				.setCustomId('blacklist')
				.setPlaceholder(t('misc.user_selection'))
				.setMinValues(1)
				.setMaxValues(10);
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

				const voiceACL = await client.voiceService.getVoiceACLForTempVoice(interaction.guildId!, channel.id);

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

	private async deleteTempChannel(client: ShiveronClient, guildId: string, channels: GuildChannelManager, ownerId: string, tempChannel: VoiceChannel, createTempChannelId: string): Promise<void> {
		tempChannel.delete();

		this.cleanupTempChannel(client, guildId, ownerId, channels, createTempChannelId);
	}

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


		const [tempVoice, voiceACL, created] = await client.voiceService.createOrGetTempVoice(guild.id, newOwner);

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

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(t, newOwner, guild, created, tempVoice, voiceACL, channel);

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

	private async refreshChannelControls(client: ShiveronClient, t: (path: string, vars?: Record<string, any>) => string, interaction: StringSelectMenuInteraction, channelOwner: GuildMember, channel: VoiceChannel): Promise<void> {
		const [tempVoice, voiceACL, created] = await client.voiceService.createOrGetTempVoice(interaction.guild!.id, channelOwner);

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(t, channelOwner, interaction.guild!, created, tempVoice, voiceACL, channel);

		const channelControlMessage = await interaction.message.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		this.createAutoMessageDeletion(client, channel, channelControlMessage.id, tempVoice.messagesToKeep);
		this.attachControlCollector(client, t, channelControlMessage, channelOwner, channel);
	}
}
