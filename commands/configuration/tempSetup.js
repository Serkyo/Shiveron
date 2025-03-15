const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, InteractionContextType } = require('discord.js');
const guild = require('./../../models/guild');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('temp')
		.setDescription('Configure temporary voice calls')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subCommand => subCommand
			.setName('on')
			.setDescription('Enable temporary voice calls')
			.addChannelOption(option => option
				.setName('temp_channel')
				.setDescription('The voice channel that users will have to join to create temporary voice calls')
				.addChannelTypes(ChannelType.GuildVoice)
				.setRequired(true),
			),
		)
		.addSubcommand(subCommand => subCommand
			.setName('off')
			.setDescription('Disable temporary voice calls'),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		// Fetches the selected command option, and execute the matching command
		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption === 'on') {
			// Fetches the selected channel
			const selectedChannel = interaction.options.getChannel('temp_channel');
			// Fetches the current guild
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// If the guild is already present inside the database, update the tempChannelId with the one selected
				const affectedRows = await guild.update({ tempChannelId: selectedChannel.id }, { where: { guildId: interaction.guildId } });
				if (affectedRows > 0) {
					return interaction.editReply({ content: `The temp channel was successfully changed to ${selectedChannel}` });
				}
				else {
					return interaction.editReply({ content: 'There was an error while trying to change the temp channel settings' });
				}
			}
			else {
				// If the guild is not already present inside the database, create a row for that guild with the tempChannelId matching the channel selected by the user
				try {
					await guild.create({
						guildId: interaction.guildId,
						joinChannelId: null,
						joinMessage: null,
						leaveChannelId: null,
						leaveMessage: null,
						logsChannelId: null,
						tempChannelId: selectedChannel.id,
						nbWarningsMax: null,
					});

					return interaction.editReply({ content: `The temp channel was successfully set to ${selectedChannel}` });
				}
				catch (error) {
					console.log(`An error occured while inserting into the database : ${error}`);
					return interaction.editReply({ content: 'There was an error while trying to change the temp channel settings' });
				}
			}
		}
		else if (selectedOption === 'off') {
			// Fetches the current guild from the database
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// Checks if the tempChannelId has temp channel enabled
				if (currentGuild.tempChannelId != null) {
					// Erases the tempChannelId from the database if the guild is present in it, to disable the tempChannel function
					const affectedRows = await guild.update({ tempChannelId: null }, { where: { guildId: interaction.guildId } });
					if (affectedRows > 0) {
						return interaction.editReply({ content: 'Successfully disabled temporary voice calls on this server' });
					}
					else {
						return interaction.editReply({ content: 'There was an error while trying to change the temp channel settings' });
					}
				}
				else {
					return interaction.editReply({ content: 'Temporary voice calls are not enabled on this server' });
				}
			}
			else {
				return interaction.editReply({ content: 'Temporary voice calls are not enabled on this server' });
			}
		}
	},
};