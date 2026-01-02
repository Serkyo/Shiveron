import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, Guild, GuildMember, Message, MessageFlags, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, VoiceChannel, VoiceState } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { VoiceService } from '../services/VoiceService.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';
import { MessageUtils } from '../utils/MessageUtils.js';

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
			else if (currentGuildOld.tempChannelId != null && oldState.channel != null) {
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

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(newState.member!, newState.guild, created, tempVoice, voiceACL);

		const channelControlMessage = await newChannel.send({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await VoiceService.updateTempVoice(newState.guild.id, newState.member!.id, {
			channelId: newChannel.id,
			channelControlMessageId: channelControlMessage.id,
		});

		await this.attachControlCollector(channelControlMessage, newState.member!);
		// this.createAutoMessageDeletion();
	}

	private async createChannelControlMessage(owner: GuildMember, guild: Guild, firstVoiceChannel: boolean, tempVoice: TempVoice, voiceACL: VoiceACL[]): Promise<[string, EmbedBuilder, ActionRowBuilder<StringSelectMenuBuilder>]> {
		const menuText = firstVoiceChannel ? `${owner} You will only be pinged this time because this is the first time you've created a temporary voice channel.` : '';

		const menuEmbed = new EmbedBuilder()
			.setTitle('Voice channel controls')
			.setDescription('You can edit your voice channel as you please by using the dropdown menu below. You can also manually disconnect people from your voice channel by right-clicking them.')
			.setColor('#46d8ef')
			.addFields(
				{
					name: 'Soundboards',
					value: tempVoice.soundBoardEnabled ? '```Enabled```' : '```Disabled```',
					inline: true,
				},
				{
					name: 'Streams',
					value: tempVoice.streamsEnabled ? '```Enabled```' : '```Disabled```',
					inline: true,
				},
				{
					name: 'Activities',
					value: tempVoice.activitiesEnabled ? '```Enabled```' : '```Disabled```',
					inline: true,
				},
				{
					name: 'Channel availability',
					value: tempVoice.privateChannel ? '```Private```' : '```Public```',
					inline: true,
				},
			)
			.setFooter({ text: `These controls can only be used by ${owner.displayName}.`, iconURL: owner.displayAvatarURL() });

		const whitelistedMembers = [];
		const blacklistedMembers = [];

		for (const entry of voiceACL) {
			try {
				const member = await guild.members.fetch(entry.memberId);
				if (entry.hasAccess) {
					if (tempVoice.privateChannel) {
						whitelistedMembers.push(member);
					}
				}
				else {
					blacklistedMembers.push(member);
				}
			}
			catch (error) {
				ShiveronLogger.error(`Couldn't find the guild member with the id ${entry.memberId}.`);
				throw error;
			}
		}

		if (blacklistedMembers.length > 0) {
			let blacklistText = '';
			for (const blacklistedMember of blacklistedMembers) {
				blacklistText += blacklistedMember + '\n';
			}
			menuEmbed.addFields({
				name: 'Blacklist',
				value: blacklistText,
				inline: true,
			});
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
					.setLabel('Blacklist someone')
					.setDescription('Blacklisted people won\'t be able to join')
					.setValue('blacklist')
					.setEmoji('🚫'),
			);

		if (tempVoice.privateChannel) {
			if (whitelistedMembers.length > 0) {
				let whitelistText = '';
				for (const whitelistedMember of whitelistedMembers) {
					whitelistText += whitelistedMember + '\n';
				}
				menuEmbed.addFields({
					name: 'Whitelist',
					value: whitelistText,
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

		const menuRow = new ActionRowBuilder<StringSelectMenuBuilder>()
			.addComponents(menuSelect);

		return [menuText, menuEmbed, menuRow];
	}

	private async attachControlCollector(message: Message, channelOwner: GuildMember): Promise<void> {
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

				await this.refreshChannelControls(interaction, channelOwner);
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

		const ignoreHandler = MessageUtils.createIgnoreHandler(message, target.id);

		const buttonPressed = await message.awaitMessageComponent({
			componentType : ComponentType.Button,
			time: 60000,
			filter: i => i.user.id == target.id,
		}).catch(() => null);

		ignoreHandler.stop();
		await message.edit({ components: [] });

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
						await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
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
			const soundBoardEnabled = channel.permissionsFor(interaction.guild!.roles.everyone).has(PermissionFlagsBits.UseSoundboard);

			await channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				UseSoundboard: !soundBoardEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Soundboards have been ${!soundBoardEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
					soundBoardEnabled: !soundBoardEnabled,
				});
			}
		}
	}

	private async processStreamToggle(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const streamsEnabled = channel.permissionsFor(interaction.guild!.roles.everyone).has(PermissionFlagsBits.Stream);

			channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				Stream : !streamsEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Streams and camera have been ${!streamsEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
					streamsEnabled: !streamsEnabled,
				});
			}
		}
	}

	private async processActivitiesToggle(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const activitiesEnabled = channel.permissionsFor(interaction.guild!.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities);

			channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				UseEmbeddedActivities : !activitiesEnabled,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `Activities have been ${!activitiesEnabled ? 'enabled' : 'disabled'} in ${channel}. Would you like to set this as the default setting for your voice channels ?` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
					activitiesEnabled: !activitiesEnabled,
				});
			}
		}
	}

	private async processPrivateChannel(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const channel = interaction.channel;

		if (channel instanceof VoiceChannel) {
			const privateChannel = channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel) && channel.permissionsFor(channel.guild.roles.everyone).has(PermissionFlagsBits.Connect);

			channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, {
				ViewChannel: !privateChannel ? true : null,
				Connect: !privateChannel ? true : null,
			});

			const setAsDefaultQuestion = await interaction.editReply({ content: `${channel} is now ${!privateChannel ? 'public' : 'private'}. Would you like to set this as the default settings for your voice channels ?${!privateChannel ? '\n-# You can add and remove people and roles by using the whitelist option in your voice channel controls.' : ''}` });

			const answerSetAsDefault = await this.createSetAsDefaultQuestion(setAsDefaultQuestion, channelOwner);

			if (answerSetAsDefault) {
				await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
					privateChannel: !privateChannel,
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

			const ignoredHandler = selectionMessage.createMessageComponentCollector({
				componentType: ComponentType.UserSelect,
				time: 120000,
				filter: i => i.user.id != channelOwner.id,
			});

			ignoredHandler.on('collect', async (i) => {
				await i.reply({ content: `${i.user} You are not allowed to use these buttons.`, flags: MessageFlags.Ephemeral });
			});

			const selectedUsers = await selectionMessage.awaitMessageComponent({
				componentType: ComponentType.UserSelect,
				time: 120000,
				filter: i => i.user.id != channelOwner.id,
			}).catch(() => null);

			ignoredHandler.stop();
			selectionMessage.edit({ components: [] });

			if (!selectedUsers) {
				await selectionMessage.reply('Since no answer has been given in the last 120 seconds, this interaction has been canceled.');
			}
			else {
				await selectedUsers.deferReply();
				let response = '';

				for (const userId of selectedUsers.values) {
					const user = await interaction.guild!.members.fetch(userId);

					const hasAccess = channel.permissionsFor(user).has(PermissionFlagsBits.ViewChannel) && channel.permissionsFor(user).has(PermissionFlagsBits.Connect);
					let removeFromACL;

					if (blacklist) {
						await channel.permissionOverwrites.edit(user, {
							ViewChannel: !hasAccess ? null : false,
							Connect: !hasAccess ? null : false,
						});
						removeFromACL = !hasAccess;
						response += `\n${user} was added to the blacklist`;
					}
					else {
						await channel.permissionOverwrites.edit(user, {
							ViewChannel: !hasAccess ? true : null,
							Connect: !hasAccess ? true : null,
						});
						removeFromACL = hasAccess;
						response += `\n${user} was added to the whitelist`;
					}

					if (removeFromACL) {
						await VoiceService.deleteVoiceACL(interaction.guild!.id, channelOwner.id, user.id);
					}
					else {
						await VoiceService.createOrUpdateVoiceACL(interaction.guild!.id, channelOwner.id, user.id, !hasAccess);
					}
				}

				await selectedUsers.editReply({ content: response });
			}
		}
	}

	private async processVoiceChannelLeave(oldState: VoiceState, currentGuildOld: GuildSettings) {
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

		await VoiceService.updateTempVoice(oldState.guild.id, ownerId, {
			channelId: null,
		});

		const createTempChannel = await oldState.guild.channels.fetch(currentGuildOld.tempChannelId!);

		if (createTempChannel instanceof VoiceChannel) {
			createTempChannel.permissionOverwrites.delete(ownerId);
		}
	}

	/* private async changeTempChannelOwner(): Promise<void> {

	} */

	private buildUserVoicePermissions(memberId: string, everyoneId: string, tempVoice: TempVoice, voiceACL: VoiceACL[]): {id: string; allow: bigint[]; deny: bigint[]}[] {
		const defaultPermissions: {
			id: string;
			allow: bigint[];
			deny: bigint[];
		}[] = [
			{
				id: memberId,
				allow: [
					PermissionFlagsBits.MoveMembers,
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.Connect],
				deny: [],
			},
			{
				id: everyoneId,
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
		if (tempVoice.soundBoardEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.UseSoundboard);
		}
		if (tempVoice.streamsEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.Stream);
		}
		if (tempVoice.activitiesEnabled) {
			defaultPermissions[1]!.allow.push(PermissionFlagsBits.UseEmbeddedActivities);
		}
		if (voiceACL.length != 0) {
			for (const row of voiceACL) {
				if (row.get('hasAccess')) {
					defaultPermissions.push({
						id: row.get('memberId'),
						allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
						deny: [],
					});
				}
				else {
					defaultPermissions.push({
						id: row.get('memberId'),
						allow: [],
						deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
					});
				}
			}
		}

		return defaultPermissions;
	}

	private async refreshChannelControls(interaction: StringSelectMenuInteraction, channelOwner: GuildMember): Promise<void> {
		const [tempVoice, voiceACL, created] = await VoiceService.createOrGetTempVoice(interaction.guild!.id, channelOwner);

		const [menuText, menuEmbed, menuRow] = await this.createChannelControlMessage(channelOwner, interaction.guild!, created, tempVoice, voiceACL);

		const channelControlMessage = await interaction.message.edit({
			content: menuText,
			embeds: [menuEmbed],
			components: [menuRow],
		});

		await VoiceService.updateTempVoice(interaction.guild!.id, channelOwner.id, {
			channelControlMessageId: channelControlMessage.id,
		});

		await this.attachControlCollector(channelControlMessage, channelOwner);
	}
}