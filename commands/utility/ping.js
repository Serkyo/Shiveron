const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const sent = await interaction.deferReply({ withResponse: true });
		return interaction.editReply(`Pong ! Took ${sent.resource.message.createdTimestamp - interaction.createdTimestamp}ms`);
	},
};
