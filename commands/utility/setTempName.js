const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require('discord.js');
const tempVoice = require('./../../models/tempVoice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('set')
		.setDescription('command')
		.setContexts(InteractionContextType.Guild)
		.addSubcommandGroup(subCommandGroup => subCommandGroup
			.setName('temp')
			.setDescription('subcommand')
			.addSubcommand(subCommand => subCommand
				.setName('name')
				.setDescription('Changes the name of your temporary channel')
				.addStringOption(option => option
					.setName('channel_name')
					.setDescription('The new name you want your temporary channel to have')
					.setMaxLength(100)
					.setMinLength(1)
					.setRequired(true),
				),
			),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		const name = interaction.options.getString('channel_name');
		const currentMember = await tempVoice.findOne({ where: { guildId: interaction.guildId, ownerId: interaction.member.id } });
		if (currentMember) {
			affectedRows = await tempVoice.update({ channelName: name }, { where: { guildId: interaction.guildId, ownerId: interaction.member.id } });
			if (affectedRows > 0) {
				return interaction.editReply({ content: `Successfully changed the name of your temporary channels to \`${name}\`` });
			}
			else {
				return interaction.editReply({ content: 'There was an error while trying to change the name of your temporary channels' });
			}
		}
		else {
			try {
				tempVoiceChannel = await tempVoice.create ({
					guildId: interaction.guildId,
					ownerId: interaction.member.id,
					channelId: null,
					channelName: name,
				});
				return interaction.editReply({ content: `Successfully changed the name of your temporary channels to \`${name}\`` });
			}
			catch (error) {
				console.log(`Error while trying to create a temporary channel through setTempName : ${error}`);
				return interaction.editReply({ content: 'There was an error while trying to change the name of your temporary channels' });
			}
		}
	},
};