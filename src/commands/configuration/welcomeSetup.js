const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags, InteractionContextType } = require('discord.js');
const guild = require('./../../models/guild');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('welcome')
		.setDescription('Configure welcome messages')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommand(subCommand => subCommand
			.setName('on')
			.setDescription('Enable welcome messages')
			.addChannelOption(option => option
				.setName('welcome_channel')
				.setDescription('The channel where the messages will be sent')
				.addChannelTypes(ChannelType.GuildText)
				.setRequired(true),
			)
			.addStringOption(option => option
				.setName('message')
				.setDescription('The message that will be sent to new members')
				.setRequired(true),
			),
		)
		.addSubcommand(subCommand => subCommand
			.setName('off')
			.setDescription('Disable welcome messages'),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });
		// Fetches the selected command option, and execute the matching command
		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'on') {
			// Fetches the options content
			const selectedChannel = interaction.options.getChannel('welcome_channel');
			const welcomeMessage = interaction.options.getString('message');
			// Fetches the current guild
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// If the guild is already present inside the database, update the corresponding fields with the options content
				const affectedRows = await guild.update({ joinChannelId: selectedChannel.id, joinMessage: welcomeMessage }, { where: { guildId: interaction.guildId } });
				if (affectedRows > 0) {
					return interaction.editReply({ content: `The welcome channel was successfully set to ${selectedChannel}, with the message "${welcomeMessage}"` });
				}
				else {
					return interaction.editReply({ content: 'There was an error while trying to change the welcome settings' });
				}
			}
			else {
				// If the guild is not already present inside the database, create a row for that guild with the options content
				try {
					await guild.create({
						guildId: interaction.guildId,
						joinChannelId: selectedChannel.id,
						joinMessage: welcomeMessage,
						leaveChannelId: null,
						leaveMessage: null,
						logsChannelId: null,
						tempChannelId: null,
						nbWarningsMax: null,
					});

					return interaction.editReply({ content: `The welcome channel was successfully set to ${selectedChannel}, with the message "${welcomeMessage}"` });
				}
				catch (error) {
					console.log(`An error occured while inserting into the database : ${error}`);
					return interaction.editReply({ content: 'There was an error while trying to change the welcome settings' });
				}
			}
		}
		else if (selectedOption == 'off') {
			// Fetches the current guild from the database
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				// Checks if the current guild has welcome messages enabled
				if (currentGuild.joinChannelId != null) {
					// Erases the joinChannelId and the joinMessage from the database if the guild is present in it, to disable the welcome message function
					const affectedRows = await guild.update({ joinChannelId: null, joinMessage: null }, { where: { guildId: interaction.guildId } });
					if (affectedRows > 0) {
						return interaction.editReply({ content: 'Successfully disabled welcome messages on this server' });
					}
					else {
						return interaction.editReply({ content: 'There was an error while trying to change the welcome settings' });
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