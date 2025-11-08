import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, InteractionContextType, PermissionFlagsBits, MessageFlags, GuildTextBasedChannel, Message } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export default class PurgeCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
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
		);

	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const messageAmount = interaction.options.getInteger('amount');
		const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel || interaction.channel;

		if (!messageAmount || messageAmount < 1) {
			await interaction.editReply({ content: 'The message amount must be an integer value greater or equal to 1' });
			return;
		}

		const messageList = await channel.messages.fetch({ limit: messageAmount });

		const [bulkDeletableMessages, notBulkDeletableMessages] = messageList.partition(message => message.bulkDeletable);

		for (const message of notBulkDeletableMessages) {
			if (message instanceof Message) {
				await message.delete();
			}
		}
		await channel.bulkDelete(bulkDeletableMessages);

		await interaction.editReply({ content: `Successfully started deleting ${messageAmount} messages from the channel ${channel}` });
	}

}