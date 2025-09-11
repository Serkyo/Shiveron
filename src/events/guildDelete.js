const { Events } = require('discord.js');
const guild = require('./../models/guild');
const tempVoice = require('./../models/tempVoice');
// const voiceACL = require('./../models/voiceACL');

module.exports = {
	name: Events.GuildDelete,
	async execute(leftGuild) {
		try {
			guild.destroy({ where: { guildId: leftGuild.id } });
			tempVoice.destroy({ where: { guildId: leftGuild.id } });
			// voiceACL.destroy({ where: { guildId: leftGuild.id } });
		}
		catch (error) {
			console.log(`There was an error while deleting the guild information from the database : ${error}`);
		}
	},
};