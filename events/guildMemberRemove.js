const { Events } = require('discord.js');
const guild = require('./../models/guild');
const interpolateTemplate = require('./../utils/interpolateTemplate');

module.exports = {
	name: Events.GuildMemberRemove,
	async execute(member) {
		// Fetch the current guild from the database (if it exists, i.e if a configuration command was used in it)
		const currentGuild = await guild.findOne({ where: { guildId: member.guild.id } });
		if (currentGuild) {
			// Checks if the current guild has enabled departure messages
			if (currentGuild.leaveChannelId != null) {
				const leaveChannel = await member.guild.channels.cache.get(currentGuild.leaveChannelId);
				await leaveChannel.send(interpolateTemplate(currentGuild.leaveMessage, { user: member, server: member.guild, memberCount: member.guild.memberCount }));
			}
		}
	},
};