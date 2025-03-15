const { Events } = require('discord.js');
const guild = require('./../models/guild');
const interpolateTemplate = require('./../utils/interpolateTemplate');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
		// Fetch the current guild from the database (if it exists, i.e if a configuration command was used in it)
		const currentGuild = await guild.findOne({ where: { guildId: member.guild.id } });
		if (currentGuild) {
			// Checks if the current guild has enabled departure messages
			if (currentGuild.joinChannelId != null) {
				const joinChannel = await member.guild.channels.cache.get(currentGuild.joinChannelId);
				await joinChannel.send(interpolateTemplate(currentGuild.joinMessage, { user: member, server: member.guild, memberCount: member.guild.memberCount }));
			}
		}
	},
};