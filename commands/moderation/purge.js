const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Removes a number of messages from a channel')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption(option => option
			.setName('amount')
			.setDescription('The amount of messages to delete')
			.setRequired(true),
		)
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The channel in which the message will be deleted')
			.addChannelTypes(ChannelType.GuildText),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const messageAmount = interaction.options.getInteger('amount');
		let channel = interaction.options.getChannel('channel');
		if (channel == null) {
			channel = interaction.channel;
		}
		const messageList = await channel.messages.fetch({ limit: messageAmount });
		const [bulkDeletableMessages, notBulkDeleatableMessages] = messageList.partition(message => message.bulkDeletable);
		notBulkDeleatableMessages.each(async message => {
			await message.delete();
		});
		await channel.bulkDelete(bulkDeletableMessages);

		return interaction.editReply({ content: `Successfully started deleting ${messageAmount} messages from the channel ${channel}` });
	},
};