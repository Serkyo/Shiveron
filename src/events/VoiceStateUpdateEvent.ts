import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, Guild, GuildMember, Message, MessageFlags, OverwriteType, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, UserSelectMenuInteraction, VoiceChannel, VoiceState } from 'discord.js';
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

	public async execute(_client: ShiveronClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
		try {
			const [currentGuildOld] = await GuildSettingsService.createOrGetGuildSettings(oldState.guild.id);
			const [currentGuildNew] = await GuildSettingsService.createOrGetGuildSettings(newState.guild.id);

			if (currentGuildNew.tempChannelId != null) {
				await this.processVoiceChannelJoin(newState, currentGuildNew);
			}
			if (currentGuildOld.tempChannelId != null && oldState.channelId != null) {
				await this.processVoiceChannelLeave(oldState, currentGuildOld);
			}
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}

	private async processVoiceChannelJoin(newState: VoiceState, currentGuildNew: GuildSettings): Promise<void> {
		if (newState.channelId == currentGuildNew.tempChannelId && newState.member != null) {
			try {
				await this.createTempChannel(newState);
			}
			catch (error) {
				ShiveronLogger.error('An error occured while creating a new temporary voice channel');
				throw error;
			}
		}
	}

	private async createTempChannel(newState: VoiceState): Promise<void> {
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

		await this.attachControlCollector(channelControlMessage, newState.member!, newChannel);
		// this.createAutoMessageDeletion();
	}

	private async createChannelControlMessage(owner: GuildMember, guild: Guild, firstVoiceChannel: boolean, tempVoice: TempVoice, voiceACL: VoiceACL[], newChannel: VoiceChannel): Promise<[string, EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
		const menuText = firstVoiceChannel ? `${owner} You will only be pinged this time because this is the first time you've created a temporary voice channel.` : '';

		const soundBoardEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);
		let soundboardStatus;
		if (tempVoice.soundBoardEnabled == soundBoardEnabledTemporarily) {
			soundboardStatus = soundBoardEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			soundboardStatus = soundBoardEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```'
		}

		const streamsEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Stream);
		let streamsStatus;
		if (tempVoice.streamsEnabled == streamsEnabledTemporarily) {
			streamsStatus = streamsEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			streamsStatus = streamsEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```'
		}

		const activitiesEnabledTemporarily = newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);
		let activitiesStatus;
		if (tempVoice.activitiesEnabled == activitiesEnabledTemporarily) {
			activitiesStatus = activitiesEnabledTemporarily ? '```Enabled```' : '```Disabled```';
		}
		else {
			activitiesStatus = activitiesEnabledTemporarily ? '```Enabled temporarily```' : '```Disabled temporarily```'
		}

		const privateChannelTemporarily = !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !newChannel.permissionsFor(guild.roles.everyone).has(PermissionFlagsBits.Connect);
		let privateChannelStatus;
		if (tempVoice.privateChannel == privateChannelTemporarily) {
			privateChannelStatus = privateChannelTemporarily ? '```Private```' : '```Public```';
		}
		else {
			privateChannelStatus = privateChannelTemporarily ? '```Private temporarily```' : '```Public temporarily```'
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
			)
			.setFooter({ text: `These controls can only be used by ${owner.displayName}.`, iconURL: owner.displayAvatarURL() });

		const whitelistedMembers = [];
		const blacklistedMembers = [];

		for (const entry of voiceACL) {
			if (entry.hasAccess) {
				console.log(entry.memberId + "has access");
				if (tempVoice.privateChannel) {
					whitelistedMembers.push(`<@${entry.memberId}>`);
				}
			}
			else {
				console.log(entry.memberId + "doesn't have access");
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
			);

		if (privateChannelTemporarily) {
			if (whitelistedMembers.length > 0) {
				menuEmbed.addFields({
					name: 'Whitelist',
					value: whitelistedMembers.join(" | "),
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
					value: blacklistedMembers.join(" | "),
					inline: false,
				});
			}

			menuSelect.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Blacklist someone')
					.setDescription('Blacklisted people won\'t be able to join')
					.setValue('blacklist')
					.setEmoji('🚫')
			)
		}

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(menuSelect);

		return [menuText, menuEmbed, menuRow];
	}

	private async attachControlCollector(message: Message, channelOwner: GuildMember, newChannel: VoiceChannel): Promise<void> {
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
					await this.processNameChange(interaction, channelOwner);
					break;
				}
				case 'soundboard_toggle': {
					await this.processSoundboardToggle(interaction, channelOwner);
					break;
				}
				case 'stream_toggle': {
					await this.processStreamToggle(interaction, channelOwner);
					break;
				}
				case 'activities_toggle': {
					await this.processActivitiesToggle(interaction, channelOwner);
					break;
				}
				case 'private_channel': {
					await this.processPrivateChannel(interaction, channelOwner);
					break;
				}
				case 'blacklist': {
					await this.processACL(interaction, channelOwner, true);
					break;
				}
				case 'whitelist': {
					await this.processACL(interaction, channelOwner, false);
					break;
				}
				}

				await this.refreshChannelControls(interaction, channelOwner, newChannel);
			}
		});
	}

	private async createSetAsDefaultQuestion(message: Message, target: GuildMember): Promise<boolean> {
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

		const buttonPressed = await awaitAuthorizedComponentInteraction(message, target.id, ComponentType.Button);

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

	private async processNameChange(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const nameMessage = await interaction.editReply({ content: 'Enter the new name you want to use for your voice channel.' });

			const collectedMessages = await channel.awaitMessages({
				time: 60000,
				max: 1,
				filter: message => channelOwner.id == message.author.id,
			});

			if (collectedMessages.size == 0) {
				await nameMessage.reply('Since no answer has been given in the last 60 seconds, this interaction has been canceled.');
			}
			else {
				const answer = collectedMessages.first()!;

				if (answer.content.length >= 100) {
					await answer.reply({ content: 'The name of the voice channel cannot contain more than 100 characters. Please try again with a name that respects this condition.' });
				}
				else {
					await channel.setName(answer.content);

					const setAsDefaultQuestion = await answer.reply({ content: `The name of your voice channel was set to "${answer.content}". Would you like to set this as the default setting for your voice channels ?` });

					const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

					if (answerSetAsDefault) {
						await VoiceService.updateTempVoice({
							guildId: channel.guild.id,
							ownerId: channelOwner.id,
							channelName: answer.content,
						});
					}
				}
			}
		}
	}

	private async processSoundboardToggle(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const soundBoardEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard);

			await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseSoundboard: !soundBoardEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Soundboards have been ${!soundBoardEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwner.id,
					soundBoardEnabled: !soundBoardEnabled,
				});
			}
		}
	}

	private async processStreamToggle(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const streamsEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Stream);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				Stream : !streamsEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Streams and camera have been ${!streamsEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwner.id,
					streamsEnabled: !streamsEnabled,
				});
			}
		}
	}

	private async processActivitiesToggle(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const activitiesEnabled = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				UseEmbeddedActivities : !activitiesEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Activities have been ${!activitiesEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwner.id,
					activitiesEnabled: !activitiesEnabled,
				});
			}
		}
	}

	private async processPrivateChannel(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const isPrivateChannel = !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && !channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Connect);

			channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
				ViewChannel: isPrivateChannel,
				Connect: isPrivateChannel,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `${channel} is now ${!isPrivateChannel ? 'private' : 'public'}. Would you like to set this as the default settings for your voice channels ?${!isPrivateChannel ? '\n-# You can add and remove people and roles by using the whitelist option in your voice channel controls.' : ''}` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice({
					guildId: channel.guild.id,
					ownerId: channelOwner.id,
					privateChannel: !isPrivateChannel,
				});
			}
		}
	}

	private async processACL(interaction: StringSelectMenuInteraction, channelOwner: GuildMember, blacklist: boolean): Promise<void> {
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

			const selectedUsers = await awaitAuthorizedComponentInteraction(selectionMessage, channelOwner.id, ComponentType.UserSelect) as UserSelectMenuInteraction;

			if (!selectedUsers) {
				await selectionMessage.reply('Since no answer has been given in the last 120 seconds, this interaction has been canceled.');
			}
			else {
				await selectedUsers.deferReply();
				let response = '';

				for (const userId of selectedUsers.values) {
					const user = await channel.guild.members.fetch(userId);

					const hasAccess = channel.permissionsFor(user).has(PermissionFlagsBits.ViewChannel) && channel.permissionsFor(user).has(PermissionFlagsBits.Connect);

					if (blacklist) {
						await channel.permissionOverwrites.edit(user, {
							ViewChannel: !hasAccess ? null : false,
							Connect: !hasAccess ? null : false,
						});

						if (!hasAccess) {
							response += `\n${user} was removed from the blacklist`;
							await VoiceService.deleteVoiceACL(channel.guild.id, channelOwner.id, user.id);
						}
						else {
							response += `\n${user} was added to the blacklist`;
							await VoiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwner.id, user.id, false);
						}
					}
					else {
						await channel.permissionOverwrites.edit(user, {
							ViewChannel: !hasAccess ? true : null,
							Connect: !hasAccess ? true : null,
						});

						if (!hasAccess) {
							response += `\n${user} was added to the whitelist`;
							await VoiceService.createOrUpdateVoiceACL(channel.guild.id, channelOwner.id, user.id, true);
						}
						else {
							response += `\n${user} was removed from the whitelist`;
							await VoiceService.deleteVoiceACL(channel.guild.id, channelOwner.id, user.id);
						}
					}
				}

				await selectedUsers.editReply({ content: response });
			}
		}
	}

	private async processVoiceChannelLeave(oldState: VoiceState, currentGuildOld: GuildSettings): Promise<void> {
		const tempVoice = await VoiceService.getTempVoiceByChannelId(oldState.channelId!);
		if (tempVoice) {
			if (oldState.channel!.members.size == 0) {
				try {
					await this.deleteTempChannel(oldState, tempVoice.ownerId, currentGuildOld);
				}
				catch (error) {
					ShiveronLogger.error('An error occured while deleting a temporary voice channel');
					throw error;
				}
			}
			/* else if (oldState.member!.id == tempVoice.ownerId) {
				try {
					await this.changeTempChannelOwner();
				}
				catch (error) {
					ShiveronLogger.error(`An error occured while transfering ownership of a temporary voice channel`);
					throw error;
				}
			} */
		}

	}

	private async deleteTempChannel(oldState: VoiceState, ownerId: string, currentGuildOld: GuildSettings): Promise<void> {
		await oldState.channel!.delete();

		await VoiceService.updateTempVoice({
			guildId: oldState.guild.id,
			ownerId,
			channelId: null,
		});

		const createTempChannel = await oldState.guild.channels.fetch(currentGuildOld.tempChannelId!);

		if (createTempChannel instanceof VoiceChannel) {
			createTempChannel.permissionOverwrites.delete(ownerId);
		}
	}

	/* private async changeTempChannelOwner(): Promise<void> {

	} */

	private buildUserVoicePermissions(memberId: string, everyoneId: string, tempVoice: TempVoice, voiceACL: VoiceACL[]): {id: string; type: OverwriteType; allow: bigint[]; deny: bigint[]}[] {
		const defaultPermissions: {
			id: string;
			type: OverwriteType;
			allow: bigint[];
			deny: bigint[];
		}[] = [
			{
				id: memberId,
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

	private async refreshChannelControls(interaction: StringSelectMenuInteraction, channelOwner: GuildMember, newChannel: VoiceChannel): Promise<void> {
		const [tempVoice, voiceACL, created] = await VoiceService.createOrGetTempVoice(interaction.guild!.id, channelOwner);

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(channelOwner, interaction.guild!, created, tempVoice, voiceACL, newChannel);

		const channelControlMessage = await interaction.message.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await VoiceService.updateTempVoice({
			guildId: interaction.guild!.id,
			ownerId: channelOwner.id,
			channelControlMessageId: channelControlMessage.id,
		});

		await this.attachControlCollector(channelControlMessage, channelOwner, newChannel);
	}
}