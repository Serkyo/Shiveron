const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply();
		return interaction.editReply('Pong!');
	},
};
