const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuOptionBuilder, ComponentType, MessageFlags, ButtonStyle, ButtonBuilder, UserSelectMenuBuilder, MentionableSelectMenuBuilder } = require('discord.js');
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
					let firstVoiceChannel = false;
					if (!tempVoiceChannel) {
						try {
							tempVoiceChannel = await tempVoice.create ({
								guildId: newState.guild.id,
								ownerId: newState.member.id,
								channelId: null,
								channelName: newState.member.displayName,
							});
							firstVoiceChannel = true;
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
					try {
						// Change the permissions of the create temp channel to prevent the user from creating another channel while one is already created
						await newState.channel.permissionOverwrites.create(newState.member, {
							Connect: false,
						});
						// Move the user into the new channel
						await newState.setChannel(newChannel);
					}
					catch (error) {
						console.log(`An error occured while creating a new channel. This error is probably due to the user leaving too quickly, and can be ignored in most cases : ${error}`);
						newChannel.delete();
						return;
					}
					// Send the context menu to the new channel
					const menuText = firstVoiceChannel ? `${newState.member} You will only be pinged this time because this is the first time you've created a temporary voice channel` : '';
					const menuEmbed = new EmbedBuilder()
						.setTitle('Voice channel controls')
						.setDescription('You can edit your voice channel as you please by using the dropdown menu below. You can also manually disconnect people from your voice channel by right-clicking them. Here are the list of things you can do :\n- Change the name of your current voice channel, as well as the default name of your voice channels\n- Enable or disable soundboards, streams / camera and activities from being used\n- Change the visibility of the voice channel : you can make it private for only you and the people you\'ve chosen (still under development)\n- Blacklist the people you want from accessing your channel, they won\'t be able to see or connect to your channel')
						.setColor('#46d8ef')
						.setFooter({ text: `These controls can only be used by ${newState.member.displayName}`, iconURL: newState.member.displayAvatarURL() });
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
								.setDescription('Only people you\'ve allowed will be able to join')
								.setValue('private_channel')
								.setEmoji('👥'),
							new StringSelectMenuOptionBuilder()
								.setLabel('Blacklist someone')
								.setDescription('Blacklisted people won\'t be able to join')
								.setValue('blacklist')
								.setEmoji('🚫'),
						);
					const menuRow = new ActionRowBuilder()
						.addComponents(menuSelect);
					const menu = await newChannel.send({ content: menuText, embeds: [menuEmbed], components: [menuRow] });
					// Attach a collector to the context menu, to listen to user's input
					const menuCollector = await menu.createMessageComponentCollector({
						componentType: ComponentType.StringSelect,
						filter: i => i.user.id == newState.member.id,
					});
					// Triggered if the user who interacted isn't the owner of the channel
					menuCollector.on('ignore', async interaction => {
						return interaction.reply({ content: `${interaction.user} You are not allowed to use these buttons`, flags: MessageFlags.Ephemeral });
					});
					// Listen when user select something
					menuCollector.on('collect', async interaction => {
						if (interaction.values.length > 0) {
							await interaction.deferReply();
							// Check which action has been selected
							switch (interaction.values[0]) {
							case 'name_change':{
								const nameMessage = await interaction.editReply({ content: 'Enter the new name you want to use for your voice channel' });
								// Creating a message collector to fetch the answer from the user. Expires after 60 seconds, or once it has read something
								const messageCollector = await newChannel.createMessageCollector({
									filter: message => newState.member.id == message.author.id,
									time: 60_000,
									max: 1,
								});
								messageCollector.on('end', async () => {
								// Send a message if the collector expired because of the time limit
									if (messageCollector.endReason == 'time') {
										return nameMessage.reply('Since no answer has been given in the last 60 seconds, this interaction has been canceled');
									}
								});
								messageCollector.on('collect', async message => {
									if (message.content.length >= 100) {
										await message.reply({ content: 'The name of the voice channel cannot contain more than 100 characters. Please try again with a name that respects this condition' });
									}
									else {
									// Change the name of the voice channel
										await newChannel.setName(message.content);
										// Inform the user that the channel name has been changed, and asks them if they want to make it the default name with a button.
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
										// The button expires once 60 seconds have passed, or once an answer has been received
										const buttonCollector = await defaultNameMessage.createMessageComponentCollector({
											componentType : ComponentType.Button,
											time: 60_000,
											max: 1,
											filter: i => i.user.id == newState.member.id,
										});
										buttonCollector.on('end', async () => {
										// Remove the inactive buttons
											await defaultNameMessage.edit({ components: [] });
											// Send a message if the collector expired because of the time limit
											if (buttonCollector.endReason == 'time') {
												return defaultNameMessage.reply(`Since no answer have been given in the last 60 seconds, "${message.content}" will not be set as the default name for your voice channels`);
											}
										});
										// Triggered if the user who interacted isn't the owner of the channel
										buttonCollector.on('ignore', async i => {
											return i.reply({ content: `${i.user} You are not allowed to use these buttons`, flags: MessageFlags.Ephemeral });
										});
										buttonCollector.on('collect', async i => {
											await i.deferReply();
											if (i.customId == 'enable') {
											// Fetches the current member in the temp voice table from the database to change the default channel name
												const currentMember = await tempVoice.findOne({ where: { guildId: i.guildId, ownerId: i.member.id } });
												// If it exists, then edit it, otherwise create a new entry for that user
												if (currentMember) {
													affectedRows = await tempVoice.update({ channelName: message.content }, { where: { guildId: i.guildId, ownerId: i.member.id } });
													if (affectedRows > 0) {
														return i.editReply({ content: `Successfully changed the default name of your voice channels to "${message.content}"` });
													}
													else {
														return i.editReply({ content: 'There was an error while trying to change the default name of your voice channels' });
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
														return i.editReply({ content: `Successfully changed the name of your voice channels to "${message.content}"` });
													}
													catch (error) {
														console.log(`Error while trying to create a new row in the database : ${error}`);
														return i.editReply({ content: 'There was an error while trying to change the default name of your voice channels' });
													}
												}
											}
											else {
												return i.editReply({ content: `The default name of your voice channels won't be set to "${message.content}"` });
											}
										});
									}
								});
								break;
							}
							case 'soundboard_toggle':
							// Checks if the channel has the permission for using the soundboard
								if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.UseSoundboard)) {
								// Prevent soundboard usage for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										UseSoundboard: false,
									});
									return interaction.editReply({ content: `Soundboards have been disabled in ${newChannel}` });
								}
								else {
								// Allow soundboard usage for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										UseSoundboard: true,
									});
									return interaction.editReply({ content: `Soundboards have been enabled in ${newChannel}` });

								}
							case 'stream_toggle':
							// Checks if the channel has the permission for streaming
								if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.Stream)) {
								// Prevent streams for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										Stream : false,
									});
									return interaction.editReply({ content: `Streams and camera have been disabled in ${newChannel}` });
								}
								else {
								// Allow soundboard usage for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										Stream: true,
									});
									return interaction.editReply({ content: `Streams and camera have been enabled in ${newChannel}` });

								}
							case 'activities_toggle':
							// Checks if the channel has the permission for using activities
								if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.UseEmbeddedActivities)) {
								// Prevent the usage of activities for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										UseEmbeddedActivities : false,
									});
									return interaction.editReply({ content: `Activities have been disabled in ${newChannel}` });
								}
								else {
								// Allow the usage of activities for everyone in the channel
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										UseEmbeddedActivities: true,
									});
									return interaction.editReply({ content: `Activities have been enabled in ${newChannel}` });

								}
							case 'private_channel':
								// Checks if the channel is public (i.e if the role @everyone has the permissions ViewChannel and Connect)
								if (newChannel.permissionsFor(newState.guild.roles.everyone).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
									// Make the channel private
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										ViewChannel : false,
										Connect: false,
									});
									// Create a menu which is sent along with the reponse, allowing the user to add people to the whitelist
									const mentionableSelect = new MentionableSelectMenuBuilder()
										.setCustomId('whitelist')
										.setPlaceholder('Select users or roles')
										.setMinValues(0)
										.setMaxValues(25);
									const rowWhitelist = new ActionRowBuilder()
										.addComponents(mentionableSelect);
									const whitelistMessage = await interaction.editReply({ content: `${newChannel} is now private. You can add and remove people and roles by using the selection menu below this message`, components: [rowWhitelist] });
									// Attach a collector to the menu, which expires after 3 uses or 1 hour
									const mentionnableCollector = await whitelistMessage.createMessageComponentCollector({
										time: 1200_000,
										max: 3,
										filter: i => i.user.id == newState.member.id,
									});
									mentionnableCollector.on('end', async endReason => {
										let collectorEndReason;
										if (endReason == 'time') {
											collectorEndReason = '\n-#The menu has been disabled because more than 10 minutes have passed since the last interaction. If you want to add someone else to the whitelist, please disable the private channel and re-enable it';
										}
										else {
											collectorEndReason = '\n-#The menu has been disabled since it was used more than 3 times. If you want to add someone else to the whitelist, please disable the private channel and re-enable it';
										}
										// Remove the inactive menu and edit the message content with the appropriate reason
										return whitelistMessage.edit({ content: whitelistMessage.content + collectorEndReason, components: [] });
									});
									// Triggered if the user who interacted isn't the owner of the channel
									mentionnableCollector.on('ignore', async i => {
										// Check if the user who interacted is the owner of the channel
										return i.reply({ content: `${i.user} You are not allowed to use these buttons`, flags: MessageFlags.Ephemeral });

									});
									mentionnableCollector.on('collect', async i => {
										if (i.values.length > 0) {
											let response = '';
											await i.deferReply({ AllowedMentionsTypes: {} });
											// Go through every role checked by the channel owner in the select menu
											i.roles.forEach(async role => {
											// Adds them to the whitelist if they weren't in it already
												if (!newChannel.permissionsFor(role).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
													await newChannel.permissionOverwrites.create(role, {
														ViewChannel: true,
														Connect: true,
													});
													response += `\n${role} was added to the whitelist`;
												}
												// Remove them from the whitelist if they were already in it
												else {
													await newChannel.permissionOverwrites.delete(role);
													response += `\n${role} was removed from the whitelist`;
												}
												await i.editReply({ content: `${response}` });
											});
											// Go through every user checked by the channel owner in the select menu
											i.members.forEach(async memberId => {
												const user = await newState.guild.members.fetch(memberId);
												// Adds them to the whitelist if they weren't in it already
												if (!newChannel.permissionsFor(user).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
													await newChannel.permissionOverwrites.create(user, {
														ViewChannel: true,
														Connect: true,
													});
													response += `\n${user} was added to the whitelist`;
												}
												// Remove them from the whitelist if they were already in it
												else {
													await newChannel.permissionOverwrites.delete(user);
													response += `\n${user} was removed from the whitelist`;
												}
												await i.editReply({ content: `${response}` });
											});
										}
									});
								}
								else {
								// Make the channel public again
									newChannel.permissionOverwrites.edit(newState.guild.roles.everyone, {
										ViewChannel : true,
										Connect: true,
									});
									return interaction.editReply({ content: `${newChannel} is now public again` });
								}
								break;
							case 'blacklist': {
							// Create a menu which is sent along with the reponse, allowing the user to add people to the blacklist
								const memberSelect = new UserSelectMenuBuilder()
									.setCustomId('blacklist')
									.setPlaceholder('Select users')
									.setMinValues(1)
									.setMaxValues(10);
								const rowBlacklist = new ActionRowBuilder()
									.addComponents(memberSelect);
								const blacklistMessage = await interaction.editReply({ content: `Select the people you want to add to the blacklist of ${newChannel}. If they are already blacklisted, they will be removed from it`, components: [rowBlacklist] });
								// Attach a collector to the menu, which expires after 1 use or 2 minutes
								const memberCollector = await blacklistMessage.createMessageComponentCollector({
									time: 120_000,
									max: 1,
									filter: i => i.user.id == newState.member.id,
								});
								memberCollector.on('end', async () => {
								// Remove the inactive buttons
									await blacklistMessage.edit({ components: [] });
									// Send a message if the collector expired because of the time limit
									if (memberCollector.endReason == 'time') {
										return blacklistMessage.reply('Since no answer has been given in the last 120 seconds, this interaction has been canceled');
									}
								});
								// Triggered if the user who interacted isn't the owner of the channel
								memberCollector.on('ignore', async i => {
									return i.reply({ content: `${i.user} You are not allowed to use these buttons`, flags: MessageFlags.Ephemeral });
								});
								memberCollector.on('collect', async i => {
									let response = '';
									await i.deferReply({ AllowedMentionsTypes: {} });
									// Go through every user checked by the channel owner in the select menu
									i.values.forEach(async userId => {
									// Adds them to the blacklist if they weren't in it already
										const user = await newState.guild.members.fetch(userId);
										if (newChannel.permissionsFor(user).has(PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect)) {
											await newChannel.permissionOverwrites.create(user, {
												ViewChannel: false,
												Connect: false,
											});
											response += `\n${user} was added to the blacklist`;
										}
										// Remove them from the blacklist if they were already in it
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