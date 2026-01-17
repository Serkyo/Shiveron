import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, ComponentType, EmbedBuilder, Guild, GuildChannelManager, GuildMember, Message, MessageFlags, OverwriteType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction, VoiceChannel, VoiceState } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { VoiceService } from '../services/VoiceService.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';
import { awaitAuthorizedComponentInteraction } from '../utils/discord/interactions.js';

export default class VoiceStateUpdateEvent extends BaseEvent<'voiceStateUpdate'> {
	public readonly name = 'voiceStateUpdate';
	public once = false;

	public async execute(client: ShiveronClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
		try {
			const [currentGuildOld] = await GuildSettingsService.createOrGetGuildSettings(oldState.guild.id);
			const [currentGuildNew] = await GuildSettingsService.createOrGetGuildSettings(newState.guild.id);

			if (currentGuildNew.tempChannelId) {
				await this.processVoiceChannelJoin(client, newState, currentGuildNew);
			}
			if (currentGuildOld.tempChannelId) {
				await this.processVoiceChannelLeave(client, oldState, currentGuildOld);
			}
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}

	private async processVoiceChannelJoin(client: ShiveronClient, newState: VoiceState, currentGuildNew: GuildSettings): Promise<void> {
		if (newState.member && newState.channelId) {
			if (newState.channelId == currentGuildNew.tempChannelId) {
				try {
					await this.createTempChannel(client, newState);
				}
				catch (error) {
					ShiveronLogger.error('An error occured while creating a new temporary voice channel');
					throw error;
				}
			}
			else {
				const tempVoice = await VoiceService.findTempVoiceInGuild(newState.guild.id, newState.channelId);
				if (tempVoice && newState.member.id != tempVoice.ownerId) {
					tempVoice.successorIds.push(newState.member.id);
					await VoiceService.updateTempVoice({
						guildId: tempVoice.guildId,
						ownerId: tempVoice.ownerId,
						successorIds: tempVoice.successorIds,
					});
				}
			}
		}
	}

	private async createTempChannel(client: ShiveronClient, newState: VoiceState): Promise<void> {
		const [tempVoice, voiceACL, created] = await VoiceService.createOrGetTempVoice(newState.guild.id, newState.member!);

		const newChannel = await newState.guild.channels.create({
			name: tempVoice.channelName,
			parent: newState.channel!.parentId,
			type: ChannelType.GuildVoice,
			permissionOverwrites: this.buildUserVoicePermissions(newState.member!.id, newState.guild.roles.everyone.id, tempVoice, voiceACL),
		});

		await newState.channel?.permissionOverwrites.create(newState.member!, {
			Connect: false,
		});

		await newState.setChannel(newChannel);

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(newState.member!, newState.guild, created, tempVoice, voiceACL, newChannel);

		const channelControlMessage = await newChannel.send({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await VoiceService.updateTempVoice({
			guildId: newState.guild.id,
			ownerId: newState.member!.id,
			channelId: newChannel.id,
			channelControlMessageId: channelControlMessage.id,
		});

		await this.createAutoMessageDeletion(client, newChannel, channelControlMessage.id, tempVoice.messagesToKeep);
		await this.attachControlCollector(client, channelControlMessage, newState.member!, newChannel);
	}

	private async createChannelControlMessage(owner: GuildMember, guild: Guild, firstVoiceChannel: boolean, tempVoice: TempVoice, voiceACL: VoiceACL[], newChannel: VoiceChannel): Promise<[string, EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
		const menuText = firstVoiceChannel ? `${owner} You will only be pinged this time because this is the first time you've created a temporary voice channel.` : '';

		const soundBoardEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);
		let soundboardStatus;
		if (tempVoice.soundBoardEnabled == soundBoardEnabledTemporarily) {
			soundboardStatus = soundBoardEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			soundboardStatus = soundBoardEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```';
		}

		const streamsEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Stream);
		let streamsStatus;
		if (tempVoice.streamsEnabled == streamsEnabledTemporarily) {
			streamsStatus = streamsEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			streamsStatus = streamsEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```';
		}

		const activitiesEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);
		let activitiesStatus;
		if (tempVoice.activitiesEnabled == activitiesEnabledTemporarily) {
			activitiesStatus = activitiesEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			activitiesStatus = activitiesEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```';
		}

		const privateChannelTemporarily = !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Connect);
		let privateChannelStatus;
		if (tempVoice.privateChannel == privateChannelTemporarily) {
			privateChannelStatus = privateChannelTemporarily ? '```Private```' : '```Public```';
		}
		else {
			privateChannelStatus = privateChannelTemporarily ? '```Private temporarily```' : '```Public temporarily```';
		}

		let messagesToKeepStatus;
		if (tempVoice.messagesToKeep) {
			messagesToKeepStatus = '```' + tempVoice.messagesToKeep + '```';
		}
		else {
			messagesToKeepStatus = '```None```';
		}

		const menuEmbed = new EmbedBuilder()
			.setTitle('Voice channel controls')
			.setDescription('You can edit your voice channel as you please by using the dropdown menu below. You can also manually disconnect people from your voice channel by right-clicking them.')
			.setColor('#46d8ef')
			.addFields(
				{
					name: 'Soundboards',
					value: soundboardStatus,
					inline: true,
				},
				{
					name: 'Streams',
					value: streamsStatus,
					inline: true,
				},
				{
					name: 'Activities',
					value: activitiesStatus,
					inline: true,
				},
				{
					name: 'Channel availability',
					value: privateChannelStatus,
					inline: true,
				},
				{
					name: 'Messages Kept',
					value: messagesToKeepStatus,
					inline: true,
				},
			)
			.setFooter({ text: `These controls can only be used by ${owner.displayName}.`, iconURL: owner.displayAvatarURL() });

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
			.setPlaceholder('Choose an action')
			.setMinValues(0)
			.setMaxValues(1)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Change name')
					.setDescription('Change the name of your voice channel')
					.setValue('name_change')
					.setEmoji('✒️'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Toggle soundboards')
					.setDescription('Enable or disable the ability to use soundboards')
					.setValue('soundboard_toggle')
					.setEmoji('📣'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Toggle streams')
					.setDescription('Enable or disable the ability to stream / use the camera')
					.setValue('stream_toggle')
					.setEmoji('🎥'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Toggle activities')
					.setDescription('Enable or disable the ability to use activities')
					.setValue('activities_toggle')
					.setEmoji('🎮'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Toggle private channel')
					.setDescription('Only people you\'ve added to the whitelist will be able to join')
					.setValue('private_channel')
					.setEmoji('👥'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Change messages deletion')
					.setDescription('Modify the amount of messages that are kept in your channel or disable it')
					.setValue('messages_deletion')
					.setEmoji('💬'),
			);

		if (privateChannelTemporarily) {
			if (whitelistedMembers.length > 0) {
				menuEmbed.addFields({
					name: 'Whitelist',
					value: whitelistedMembers.join(' | '),
					inline: false,
				});
			}

			menuSelect.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Whitelist someone')
					.setDescription('Whitelisted people will be the only people allowed to join')
					.setValue('whitelist')
					.setEmoji('✅'),
			);
		}
		else {
			if (blacklistedMembers.length > 0) {
				menuEmbed.addFields({
					name: 'Blacklist',
					value: blacklistedMembers.join(' | '),
					inline: false,
				});
			}

			menuSelect.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Blacklist someone')
					.setDescription('Blacklisted people won\'t be able to join')
					.setValue('blacklist')
					.setEmoji('🚫'),
			);
		}

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(menuSelect);

		return [menuText, menuEmbed, menuRow];
	}

	private async attachControlCollector(client: ShiveronClient, message: Message, channelOwner: GuildMember, newChannel: VoiceChannel): Promise<void> {
		const channelControlCollector = message.createMessageComponentCollector({
			componentType: ComponentType.StringSelect,
			filter: i => i.user.id == channelOwner.id,
		});

		channelControlCollector.on('ignore', async interaction => {
			await interaction.reply({ content: `${interaction.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
		});

		channelControlCollector.on('collect', async interaction => {
			channelControlCollector.stop('refresh');

			if (interaction.values.length > 0) {
				await interaction.deferReply();

				switch (interaction.values[0]) {
				case 'name_change': {
					await this.processNameChange(interaction, channelOwner.id);
					break;
				}
				case 'soundboard_toggle': {
					await this.processSoundboardToggle(interaction, channelOwner.id);
					break;
				}
				case 'stream_toggle': {
					await this.processStreamToggle(interaction, channelOwner.id);
					break;
				}
				case 'activities_toggle': {
					await this.processActivitiesToggle(interaction, channelOwner.id);
					break;
				}
				case 'private_channel': {
					await this.processPrivateChannel(interaction, channelOwner.id);
					break;
				}
				case 'blacklist': {
					await this.processACL(interaction, channelOwner.id, true);
					break;
				}
				case 'whitelist': {
					await this.processACL(interaction, channelOwner.id, false);
					break;
				}
				case 'messages_deletion': {
					await this.processMessageDeletion(interaction, channelOwner.id);
					break;
				}
				}

				await this.refreshChannelControls(client, interaction, channelOwner, newChannel);
			}
		});
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
							await message.delete();
						}
					}
					await channel.bulkDelete(bulkDeletableMessages);
				}
			});
		}

		client.voiceCollectorManager.add(channel.id, messageCollector);
	}

	private async createSetAsDefaultQuestion(message: Message, targetId: string): Promise<boolean> {
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

		await message.edit({ components: [buttonsRow] });

		const buttonPressed = await awaitAuthorizedComponentInteraction(message, targetId, ComponentType.Button);

		if (!buttonPressed) {
			await message.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled, and the default settings of your voice channels haven\'t been changed.' });
			return false;
		}
		else {
			await buttonPressed.deferReply();
			if (buttonPressed.customId == 'enable') {
				await buttonPressed.editReply({ content: 'The default settings of your voice channels were updated.' });
				return true;
			}
			else {
				await buttonPressed.editReply({ content: 'The default settings of your voice channels were not updated.' });
				return false;
			}
		}
	}

	private async processNameChange(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const nameMessage = await interaction.editReply({ content: 'Enter the new name you want to use for your voice channel.' });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				await nameMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content.length >= 100) {
					await answer.reply({ content: 'The name of the voice channel cannot contain more than 100 characters. Please try again with a name that respects this condition.' });
				}
				else {
					await channel.setName(answer.content);

					const setAsDefaultQuestion = await answer.reply({ content: `The name of your voice channel was set to "${answer.content}". Would you like to set this as the default setting for your voice channels ?` });

					const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwnerId);

					if (answerSetAsDefault) {
						await VoiceService.updateTempVoice({
							guildId: channel.guild.id,
							ownerId: channelOwnerId,
							channelName: answer.content,
						});
					}
				}
			}
		}
	}

	private async processSoundboardToggle(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const soundBoardEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);

			await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseSoundboard: !soundBoardEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Soundboards have been ${!soundBoardEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					soundBoardEnabled: !soundBoardEnabled,
				});
			}
		}
	}

	private async processStreamToggle(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const streamsEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Stream);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				Stream : !streamsEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Streams and camera have been ${!streamsEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					streamsEnabled: !streamsEnabled,
				});
			}
		}
	}

	private async processActivitiesToggle(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const activitiesEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseEmbeddedActivities : !activitiesEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Activities have been ${!activitiesEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					activitiesEnabled: !activitiesEnabled,
				});
			}
		}
	}

	private async processPrivateChannel(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const isPrivateChannel = !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Connect);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				ViewChannel: isPrivateChannel,
				Connect: isPrivateChannel,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `${channel} is now ${!isPrivateChannel ? 'private' : 'public'}. Would you like to set this as the default settings for your voice channels ?${!isPrivateChannel ? '\n-# You can add and remove people and roles by using the whitelist option in your voice channel controls.' : ''}` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwnerId);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwnerId,
					privateChannel: !isPrivateChannel,
				});
			}
		}
	}

	private async processACL(interaction: StringSelectMenuInteraction, channelOwnerId: string, blacklist: boolean): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const memberSelect = new UserSelectMenuBuilder()
				.setCustomId('blacklist')
				.setPlaceholder('Select users')
				.setMinValues(1)
				.setMaxValues(10);
			const rowSelection = new ActionRowBuilder<UserSelectMenuBuilder>()
				.addComponents(memberSelect);

			const selectionMessage = await interaction.editReply({ content: `Select the people you want to add to the blacklist of ${channel}. If they are already blacklisted, they will be removed from it`, components: [rowSelection] });

			const selectedUsers = await awaitAuthorizedComponentInteraction(selectionMessage, channelOwnerId, ComponentType.UserSelect) as UserSelectMenuInteraction;

			if (!selectedUsers) {
				await selectionMessage.reply({ content: 'Since no answer has been given in the last 120 seconds, this interaction has been canceled.' });
			}
			else {
				await selectedUsers.deferReply();
				let response = '';

				const voiceACL = await VoiceService.getVoiceACLForTempVoice(interaction.guildId!, channel.id);

				for (const userId of selectedUsers.values) {
					const user = await channel.guild.members.fetch(userId);
					const existingEntry = voiceACL.find(entry => entry.memberId == userId);
					const isOnTargetList = existingEntry && existingEntry.hasAccess == !blacklist;

					if (blacklist) {
						if (isOnTargetList) {
							await channel.permissionOverwrites.delete(userId);
							response += `\n${user} was removed from the blacklist`;
							await VoiceService.deleteVoiceACL(channel.guild.id, channelOwnerId, user.id);
						}
						else {
							await channel.permissionOverwrites.edit(user, {
								ViewChannel: false,
								Connect: false,
							});
							response += `\n${user} was added to the blacklist`;
							await VoiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwnerId, user.id, false);
						}
					}
					else if (isOnTargetList) {
						await channel.permissionOverwrites.delete(userId);
						response += `\n${user} was removed from the whitelist`;
						await VoiceService.deleteVoiceACL(channel.guild.id, channelOwnerId, user.id);
					}
					else {
						await channel.permissionOverwrites.edit(user, {
							ViewChannel: true,
							Connect: true,
						});
						response += `\n${user} was added to the whitelist`;
						await VoiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwnerId, user.id, true);
					}
				}

				await selectedUsers.editReply({ content: response });
			}
		}
	}

	private async processMessageDeletion(interaction: StringSelectMenuInteraction, channelOwnerId: string): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const amountMessage = await interaction.editReply({ content: 'Enter the new amount of messages you want to have in your calls before they are deleted by the bot\n-# You can also enter "none", which will disable this feature' });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => channelOwnerId == message.author.id,
			});

			if (collectedMessages.size == 0) {
				await amountMessage.reply({ content: 'Since no answer has been given in the last 60 seconds, this interaction has been canceled.' });
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content == 'none') {
					await VoiceService.updateTempVoice({
						guildId: channel.guildId,
						ownerId: channelOwnerId,
						messagesToKeep: null,
					});

					await amountMessage.reply({ content: 'This feature has been disabled successfully' });
				}
				else if (!isNaN(Number(answer.content))) {
					await VoiceService.updateTempVoice({
						guildId: channel.guildId,
						ownerId: channelOwnerId,
						messagesToKeep: parseInt(answer.content),
					});

					await amountMessage.reply({ content: `The amount of messages kept has been set to ${answer.content}` });
				}
				else {
					await amountMessage.reply({ content: 'The amount of messages must be either "none" or a number' });
				}
			}
		}
	}

	private async processVoiceChannelLeave(client: ShiveronClient, oldState: VoiceState, currentGuildOld: GuildSettings): Promise<void> {
		if (oldState.member && oldState.channel instanceof VoiceChannel) {
			const tempVoice = await VoiceService.getTempVoiceByChannelId(oldState.channelId!);
			if (tempVoice) {
				if (oldState.channel.members.size == 0) {
					try {
						await this.deleteTempChannel(oldState.guild.id, oldState.guild.channels, oldState.member.id, oldState.channel, currentGuildOld.tempChannelId!);
					}
					catch (error) {
						ShiveronLogger.error('An error occured while deleting a temporary voice channel');
						throw error;
					}
				}
				else if (oldState.member.id == tempVoice.ownerId) {
					try {
						await this.changeTempChannelOwner(client, oldState.guild, tempVoice.ownerId, tempVoice.successorIds, currentGuildOld.tempChannelId!, oldState.channel, tempVoice.channelControlMessageId!);
					}
					catch (error) {
						ShiveronLogger.error('An error occured while transfering ownership of a temporary voice channel');
						throw error;
					}
				}
				else {
					const index = tempVoice.successorIds.indexOf(oldState.member.id);
					if (index != -1) {
						tempVoice.successorIds.splice(index, 1);
						await VoiceService.updateTempVoice({
							guildId: tempVoice.guildId,
							ownerId: tempVoice.ownerId,
							successorIds: tempVoice.successorIds,
						});
					}
				}
			}
		}
	}

	private async deleteTempChannel(guildId: string, channels: GuildChannelManager, ownerId: string, tempChannel: VoiceChannel, createTempChannelId: string): Promise<void> {
		await tempChannel.delete();

		await this.cleanupTempChannel(guildId, ownerId, channels, createTempChannelId);
	}

	private async changeTempChannelOwner(client: ShiveronClient, guild: Guild, oldOwnerId: string, successorIds: string[], createTempChannelId: string, channel: VoiceChannel, channelControlMessageId: string): Promise<void> {
		const newOwnerId = successorIds[0]!;

		await this.cleanupTempChannel(guild.id, oldOwnerId, guild.channels, createTempChannelId);

		const newOwner = await guild.members.fetch(newOwnerId);

		const [tempVoice, voiceACL, created] = await VoiceService.createOrGetTempVoice(guild.id, newOwner);

		await channel.setName(tempVoice.channelName);
		await channel.permissionOverwrites.set(this.buildUserVoicePermissions(newOwnerId, guild.roles.everyone.id, tempVoice, voiceACL));

		const createTempChannel = await guild.channels.fetch(createTempChannelId);

		if (createTempChannel instanceof VoiceChannel) {
			await createTempChannel.permissionOverwrites.create(newOwner, {
				Connect: false,
			});
		}

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(newOwner, guild, created, tempVoice, voiceACL, channel);

		const channelControlMessage = await channel.messages.fetch(channelControlMessageId);

		await channelControlMessage.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await VoiceService.updateTempVoice({
			guildId: guild.id,
			ownerId: newOwnerId,
			channelId: channel.id,
			channelControlMessageId: channelControlMessageId,
			successorIds: successorIds.slice(1),
		});

		await this.createAutoMessageDeletion(client, channel, channelControlMessage.id, tempVoice.messagesToKeep);
		await this.attachControlCollector(client, channelControlMessage, newOwner, channel);

		await channel.send({ content: `${newOwner} This channel's ownership has been transferred to you, and all your settings have been applied.` });
	}

	private async cleanupTempChannel(guildId: string, ownerId: string, channels: GuildChannelManager, createTempChannelId: string): Promise<void> {
		await VoiceService.updateTempVoice({
			guildId,
			ownerId,
			channelId: null,
			channelControlMessageId: null,
			successorIds: [],
		});

		const createTempChannel = await channels.fetch(createTempChannelId);

		if (createTempChannel instanceof VoiceChannel) {
			await createTempChannel.permissionOverwrites.delete(ownerId);
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

	private async refreshChannelControls(client: ShiveronClient, interaction: StringSelectMenuInteraction, channelOwner: GuildMember, channel: VoiceChannel): Promise<void> {
		const [tempVoice, voiceACL, created] = await VoiceService.createOrGetTempVoice(interaction.guild!.id, channelOwner);

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(channelOwner, interaction.guild!, created, tempVoice, voiceACL, channel);

		const channelControlMessage = await interaction.message.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await this.createAutoMessageDeletion(client, channel, channelControlMessage.id, tempVoice.messagesToKeep);
		await this.attachControlCollector(client, channelControlMessage, channelOwner, channel);
	}
}