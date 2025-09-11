const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, InteractionContextType } = require('discord.js');
const guild = require('./../../models/guild');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('departure')
		.setDescription('Configure departure messages')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subCommand => subCommand
			.setName('on')
			.setDescription('Enable departure messages')
			.addChannelOption(option => option
				.setName('departure_channel')
				.setDescription('The channel where the messages will be sent')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true),
			)
			.addStringOption(option => option
				.setName('message')
				.setDescription('The message that will be sent when an user leaves by himself or is kicked')
				.setRequired(true),
			),
		)
		.addSubcommand(subCommand => subCommand
			.setName('off')
			.setDescription('Disable departure messages'),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		// Fetches the selected command option, and execute the matching command
		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'on') {
			// Fetches the options content
			const selectedChannel = interaction.options.getChannel('departure_channel');
			const departureMessage = interaction.options.getString('message');
			// Fetches the current guild
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// If the guild is already present inside the database, update the corresponding fields with the options content
				const affectedRows = await guild.update({ leaveChannelId: selectedChannel.id, leaveMessage: departureMessage }, { where: { guildId: interaction.guildId } });
				if (affectedRows > 0) {
					return interaction.editReply({ content: `The departure channel was successfully set to ${selectedChannel}, with the message "${departureMessage}"` });
				}
				else {
					return interaction.editReply({ content: 'There was an error while trying to change the departure settings' });
				}
			}
			else {
				// If the guild is not already present inside the database, create a row for that guild with the options content
				try {
					await guild.create({
						guildId: interaction.guildId,
						joinChannelId: null,
						joinMessage: null,
						leaveChannelId: selectedChannel.id,
						leaveMessage: departureMessage,
						logsChannelId: null,
						tempChannelId: null,
						nbWarningsMax: null,
					});

					return interaction.editReply({ content: `The departure channel was successfully set to ${selectedChannel}, with the message "${departureMessage}"` });
				}
				catch (error) {
					console.log(`An error occured while inserting into the database : ${error}`);
					return interaction.editReply({ content: 'There was an error while trying to change the departure settings' });
				}
			}
		}
		else if (selectedOption == 'off') {
			// Fetches the current guild from the database
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// Checks if the current guild has departure messages enabled
				if (currentGuild.leaveChannelId != null) {
					// Erases the leaveChannelId and the corresponding messages from the database if the guild is present in it, to disable the departure message function
					const affectedRows = await guild.update({ leaveChannelId: null, leaveMessage: null }, { where: { guildId: interaction.guildId } });
					if (affectedRows > 0) {
						return interaction.editReply({ content: 'Successfully disabled departure messages on this server' });
					}
					else {
						return interaction.editReply({ content: 'There was an error while trying to change the departure settings' });
					}
				}
				else {
					return interaction.editReply({ content: 'Welcome messages are not enabled on this server' });
				}
			}
			else {
				return interaction.editReply({ content: 'Welcome messages are not enabled on this server' });
			}
		}
	},
};