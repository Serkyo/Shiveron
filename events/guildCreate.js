const { Events } = require('discord.js');
const guild = require('./../models/guild');

module.exports = {
	name: Events.GuildCreate,
	async execute(joinedGuild) {
		try {
			await guild.create({
				guildId: joinedGuild.id,
				joinChannelId: null,
				joinMessage: null,
				leaveChannelId: null,
				leaveMessage: null,
				logsChannelId: null,
				tempChannelId: null,
				nbWarningsMax: null,
				// botLanguage: 'en_US',
			});
		}
		catch (error) {
			console.log(`There was an issue while trying to create a new guild entry in the database : ${error}`);
		}
	},
};