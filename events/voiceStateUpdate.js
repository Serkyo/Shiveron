const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder, ComponentType, MessageFlags, ButtonStyle, ButtonBuilder, UserSelectMenuBuilder } = require('discord.js');
const guild = require('./../models/guild');
const tempVoice = require('./../models/tempVoice');

module.exports = {
	name: Events.VoiceStateUpdate,
	async execute(oldState, newState) {
		// Fetch the current guild from the database (if it exists, i.e if a configuration command was used in it)
		const currentGuildNew = await guild.findOne({ where: { guildId: newState.guild.id } });
		const currentGuildOld = await guild.findOne({ where: { guildId: oldState.guild.id } });
		if (currentGuildNew) {
			// Checks if the current guild has enabled create temp channel
			if (currentGuildNew.tempChannelId != null) {
				// Checks if the Id of the channel that the user joined matches the Id of the create temp channel
				if (newState.channelId == currentGuildNew.tempChannelId) {
					// Fetch the corresponding parameters for the temp channel for the user that joined from the database, or create them
					let tempVoiceChannel = await tempVoice.findOne({ where: { guildId: newState.guild.id, ownerId: newState.member.id } });
					if (!tempVoiceChannel) {
						try {
							tempVoiceChannel = await tempVoice.create ({
								guildId: newState.guild.id,
								ownerId: newState.member.id,
								channelId: null,
								channelName: newState.member.displayName,
							});
						}
						catch (error) {
							console.log(`An error occured while inserting into the database : ${error}`);
							return;
						}
					}
					// Create a new channel based on the parameters that were fetched, with additional permissions for the owner
					const newChannel = await newState.guild.channels.create({
						name: tempVoiceChannel.channelName,
						parent: newState.channel.parentId,
						type: ChannelType.GuildVoice,
						permissionOverwrites: [
							{
								id: newState.member.id,
								allow: [PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
							},
							{
								id: newState.guild.roles.everyone,
								allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseSoundboard, PermissionFlagsBits.UseExternalSounds, PermissionFlagsBits.UseVAD, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis, PermissionFlagsBits.UseExternalStickers, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendTTSMessages, PermissionFlagsBits.UseApplicationCommands, PermissionFlagsBits.SendVoiceMessages, PermissionFlagsBits.UseEmbeddedActivities, PermissionFlagsBits.UseExternalApps],
							},
						],
					});
					// Update the database with the new Id for the channel
					try {
						await tempVoice.update({ channelId: newChannel.id }, { where: { guildId: newState.guild.id, ownerId: newState.member.id } });
					}
					catch (error) {
						console.log(`An error occured while updating the database : ${error}`);
						return;
					}
					// Change the permissions of the create temp channel to prevent the user from creating another channel while one is already created
					await newState.channel.permissionOverwrites.create(newState.member, {
						Connect: false,
					});
					// Move the user into the new channel
					await newState.setChannel(newChannel);
					// Send the context menu to the new channel
					const menuEmbed = new EmbedBuilder()
						.setTitle('Voice channel controls')
						.setDescription('You can edit your voice channel as you please by using the dropdown menu below. You can also manually disconnect people from your voice channel by right-clicking them. Here are the list of things you can do :\n- Change the name of your current voice channel, as well as the default name of your voice channels\n- Enable or disable soundboards, streams / camera and activities from being used\n- Change the visibility of the voice channel : you can make it private for only you and the people you\'ve chosen (still under development)\n- Blacklist the people you want from accessing your channel, they won\'t be able to see or connect to your channel')
						.setColor('#46d8ef')
						.setFooter({ text: `These controls can only be used by ${newState.member.displayName}`, iconURL: newState.member.displayAvatarURL() });
					const menuSelect = new StringSelectMenuBuilder()
						.setCustomId('vc_controls')
						.setPlaceholder('Choose an action')
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
							/* WIP
							new StringSelectMenuOptionBuilder()
								.setLabel('Toggle private channel')
								.setDescription('Only people you\'ve allowed will be able to join')
								.setValue('private_channel')
								.setEmoji('👥'),
							*/
							new StringSelectMenuOptionBuilder()
								.setLabel('Blacklist someone')
								.setDescription('Blacklisted people won\'t be able to join')
								.setValue('blacklist')
								.setEmoji('🚫'),
						);
					const menuRow = new ActionRowBuilder()
						.addComponents(menuSelect);
					const menu = await newChannel.send({ content: `${newState.member}`, embeds: [menuEmbed], components: [menuRow] });
					// Attach a collector to the context menu, to listen to user's input
					const menuCollector = await menu.createMessageComponentCollector({
						componentType: ComponentType.StringSelect,
					});
					// Listen when user select something
					menuCollector.on('collect', async interaction => {
						await interaction.deferReply();
						// Check if the user who interacted is the owner of the channel
						if (interaction.user.id != newState.member.id) {
							return interaction.editReply({ content: 'You are not allowed to use these buttons', flags: MessageFlags.Ephemeral });
						}

						switch (interaction.values[0]) {
						case 'name_change':{
							const nameMessage = await interaction.editReply({ content: 'Enter the new name you want to use for your voice channel' });
							const messageCollector = await newChannel.createMessageCollector({
								filter: message => !message.author.bot && newState.member.id == message.author.id,
								time: 60_000,
								max: 1,
							});
							messageCollector.on('end', async () => {
								if (messageCollector.endReason == 'time') {
									await nameMessage.reply('Since no answer has been given in the last 60 seconds, this interaction has been canceled');
								}
							});
							messageCollector.on('collect', async message => {
								if (message.content.length >= 100) {
									await message.reply({ content: 'The name of the voice channel cannot contain more than 100 characters. Please try again with a name that respects this condition' });
								}
								else {
									await newChannel.setName(message.content);
									const enable = new ButtonBuilder()
										.setCustomId('enable')
										.setEmoji('👍')
										.setStyle(ButtonStyle.Success);
									const disable = new ButtonBuilder()
										.setCustomId('disable')
										.setEmoji('👎')
										.setStyle(ButtonStyle.Danger);
									const buttonsRow = new ActionRowBuilder()
										.addComponents([enable, disable]);
									const defaultNameMessage = await message.reply({ content: `The name of the voice channel was successfully set to "${message.content}". Would you like to set this as the default name for your channels ?`, components: [buttonsRow] });
									const buttonCollector = await defaultNameMessage.createMessageComponentCollector({
										componentType : ComponentType.Button,
										filter: i_button => newState.member.id == i_button.user.id,
										time: 60_000,
										max: 1,
									});
									buttonCollector.on('end', async () => {
										await defaultNameMessage.edit({ components: [] });
										if (buttonCollector.endReason == 'time') {
											await defaultNameMessage.reply(`Since no answer have been given in the last 60 seconds, "${message.content}" will not be set as the default name for your voice channels`);
										}
									});
									buttonCollector.on('collect', async i => {
										await i.deferReply();
										if (i.customId == 'enable') {
											const currentMember = await tempVoice.findOne({ where: { guildId: i.guildId, ownerId: i.member.id } });
											if (currentMember) {
												affectedRows = await tempVoice.update({ channelName: message.content }, { where: { guildId: i.guildId, ownerId: i.member.id } });
												if (affectedRows > 0) {
													await i.editReply({ content: `Successfully changed the default name of your voice channels to "${message.content}"` });
												}
												else {
													await i.editReply({ content: 'There was an error while trying to change the default name of your voice channels' });
												}
											}
											else {
												try {
													tempVoiceChannel = await tempVoice.create ({
														guildId: i.guildId,
														ownerId: i.member.id,
														channelId: null,
														channelName: message.content,
													});
													await i.editReply({ content: `Successfully changed the name of your voice channels to "${message.content}"` });
												}
												catch (error) {
													console.log(`Error while trying to create a new row in the database : ${error}`);
													await i.editReply({ content: 'There was an error while trying to change the default name of your voice channels' });
												}
											}
										}
										else {
											await i.editReply({ content: `The default name of your voice channels won't be set to "${message.content}"` });
										}
									});
								}
							});
							break;
						}
						case 'soundboard_toggle':
							if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard)) {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									UseSoundboard: false,
								});
								return interaction.editReply({ content: `Soundboards have been disabled in ${newChannel}` });
							}
							else {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									UseSoundboard: true,
								});
								return interaction.editReply({ content: `Soundboards have been enabled in ${newChannel}` });

							}
						case 'stream_toggle':
							if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.Stream)) {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									Stream : false,
								});
								return interaction.editReply({ content: `Streams and camera have been disabled in ${newChannel}` });
							}
							else {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									Stream: true,
								});
								return interaction.editReply({ content: `Streams and camera have been enabled in ${newChannel}` });

							}
						case 'activities_toggle':
							if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities)) {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									UseEmbeddedActivities : false,
								});
								return interaction.editReply({ content: `Activities have been disabled in ${newChannel}` });
							}
							else {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									UseEmbeddedActivities: true,
								});
								return interaction.editReply({ content: `Activities have been enabled in ${newChannel}` });

							}
						/* WIP
						case 'private_channel':
							if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									ViewChannel : false,
									Connect: false,
								});
								await interaction.editReply({ content: `${newChannel} is now private. You can add and remove people and roles by using the selection menu below this message` });
							}
							else {
								newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
									ViewChannel : true,
									Connect: true,
								});
								await interaction.editReply({ content: `${newChannel} is now public again` });
							}
							break;
						*/
						case 'blacklist': {
							const memberSelect = new UserSelectMenuBuilder()
								.setCustomId('blacklist')
								.setPlaceholder('Select users')
								.setMinValues(1)
								.setMaxValues(10);
							const rowBlacklist = new ActionRowBuilder()
								.addComponents(memberSelect);
							const blacklistMessage = await interaction.editReply({ content: `Select the people you want to add to the blacklist of ${newChannel}. If they are already blacklisted, they will be removed from it`, components: [rowBlacklist] });
							const memberCollector = await blacklistMessage.createMessageComponentCollector({
								filter: interactionMember => newState.member.id == interactionMember.user.id,
								time: 60_000,
								max: 1,
							});
							memberCollector.on('end', async () => {
								if (memberCollector.endReason == 'time') {
									await blacklistMessage.edit({ components: [] });
									await blacklistMessage.reply('Since no answer has been given in the last 60 seconds, this interaction has been canceled');
								}
							});
							memberCollector.on('collect', async i => {
								let response = '';
								await i.deferReply();
								i.values.forEach(async userId => {
									const user = await newState.guild.members.fetch(userId);
									if (newChannel.permissionsFor(user).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
										await newChannel.permissionOverwrites.create(user, {
											ViewChannel: false,
											Connect: false,
										});
										response += `\n${user} was added to the blacklist`;
									}
									else {
										await newChannel.permissionOverwrites.delete(user);
										response += `\n${user} was removed from the blacklist`;
									}
									await i.editReply({ content: `${response}` });
								});
							});
							break;
						}
						}
					});
				}
			}
		}
		// second test is to avoid trying to access a empty field when someone joins a call for the first time
		if (currentGuildOld && oldState.channelId != null) {
			// Checks if the current guild has enabled temp channel
			if (currentGuildOld.tempChannelId != null) {
				// Fetch the corresponding parameters for the temp channel for the user that joined from the database
				const tempVoiceChannel = await tempVoice.findOne({ where: { channelId: oldState.channelId } });
				if (tempVoiceChannel) {
					// Checks if the channel is empty, and if it's the case, delete it and update the database
					if (oldState.channel.members.size == 0) {
						await oldState.guild.channels.delete(oldState.channelId);
						try {
							await tempVoiceChannel.update({ channelId: null }, { where: { guildId: oldState.guild.id, channelId: oldState.channelId } });
						}
						catch (error) {
							console.log(`An error occured while updating the database : ${error}`);
							return;
						}
						// Fetches the create temp channel
						const createTempChannel = await oldState.guild.channels.fetch(currentGuildOld.tempChannelId);
						// Removes all restrictions on that channel for the owner of the temp channel
						await createTempChannel.permissionOverwrites.delete(tempVoiceChannel.ownerId);
					}
				}
			}
		}
	},
};