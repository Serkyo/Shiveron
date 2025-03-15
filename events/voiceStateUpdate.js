const { Events, ChannelType, PermissionFlagsBits } = require('discord.js');
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
					await newState.guild.channels.create({
						name: tempVoiceChannel.channelName,
						parent: newState.channel.parentId,
						type: ChannelType.GuildVoice,
						permissionOverwrites: [
							{
								id: newState.member.id,
								allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
							},
						],
					});
					newChannelId = await newState.guild.channels.cache.find(newChannelId => newChannelId.name === tempVoiceChannel.channelName);
					// Update the database with the new Id for the channel
					try {
						await tempVoice.update({ channelId: newChannelId.id }, { where: { guildId: newState.guild.id, channelName: tempVoiceChannel.channelName } });
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
					await newState.setChannel(newChannelId);
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