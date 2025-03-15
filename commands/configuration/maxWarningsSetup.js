const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, InteractionContextType } = require('discord.js');
const guild = require('./../../models/guild');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('max')
		.setDescription('Configure auto ban functionality')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommandGroup(subCommandGroup => subCommandGroup
			.setName('warnings')
			.setDescription('subcommand')
			.addSubcommand(subCommand => subCommand
				.setName('set')
				.setDescription('Enable auto ban after a specified amount of warnings is reached. Default value is 3')
				.addIntegerOption(option => option
					.setName('number_of_warn')
					.setDescription('The maximum number of warnings allowed')
					.setMinValue(1),
				),
			)
			.addSubcommand(subCommand => subCommand
				.setName('disable')
				.setDescription('Disable auto ban based on the number of warnings received'),
			),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		// Fetches the selected command option, and execute the matching command
		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'set') {
			// Fetches the options content
			let warnAmount = interaction.options.getInteger('number_of_warn');
			if (warnAmount == null) {
				warnAmount = 3;
			}
			// Fetches the current guild
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// If the guild is already present inside the database, update the corresponding fields with the options content
				const affectedRows = await guild.update({ nbWarningsMax: warnAmount }, { where: { guildId: interaction.guildId } });
				if (affectedRows > 0) {
					return interaction.editReply({ content: `The maximum number of warnings was successfully set to ${warnAmount}` });
				}
				else {
					return interaction.editReply({ content: 'There was an error while trying to change the maximum number of warnings' });
				}
			}
			else {
				// If the guild is not already present inside the database, create a row for that guild with the options content
				try {
					await guild.create({
						guildId: interaction.guildId,
						joinChannelId: null,
						joinMessage: null,
						leaveChannelId: null,
						leaveMessage: null,
						logsChannelId: null,
						tempChannelId: null,
						nbWarningsMax: warnAmount,
					});

					return interaction.editReply({ content: `The maximum number of warnings was successfully set to ${warnAmount}` });
				}
				catch (error) {
					console.log(`An error occured while inserting into the database : ${error}`);
					return interaction.editReply({ content: 'There was an error while trying to change the maximum number of warnings' });
				}
			}
		}
		else if (selectedOption == 'disable') {
			// Fetches the current guild from the database
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// Checks if the current guild has departure messages enabled
				if (currentGuild.nbWarningsMax != null) {
					// Erases the leaveChannelId and the corresponding messages from the database if the guild is present in it, to disable the departure message function
					const affectedRows = await guild.update({ nbWarningsMax: null }, { where: { guildId: interaction.guildId } });
					if (affectedRows > 0) {
						return interaction.editReply({ content: 'Successfully disabled the auto ban feature' });
					}
					else {
						return interaction.editReply({ content: 'There was an error while trying to change the maximum number of warnings' });
					}
				}
				else {
					return interaction.editReply({ content: 'The auto ban feature is not enabled on this server' });
				}
			}
			else {
				return interaction.editReply({ content: 'The auto ban feature is not enabled on this server' });
			}
		}
	},
};