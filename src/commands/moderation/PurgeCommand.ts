import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, InteractionContextType, PermissionFlagsBits, MessageFlags, type GuildTextBasedChannel, Message } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export default class PurgeCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Removes a number of messages from a channel')
		.setDescriptionLocalizations({
			'fr': 'Supprime un nombre de messages d\'un salon',
			'de': 'Löscht eine Anzahl von Nachrichten aus einem Kanal'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption(option => option
			.setName('amount')
			.setDescription('The amount of messages to delete')
			.setDescriptionLocalizations({
				'fr': 'Le nombre de messages à supprimer',
				'de': 'Die Anzahl der zu löschenden Nachrichten'
			})
			.setRequired(true),
		)
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The channel in which the messages will be deleted')
			.setDescriptionLocalizations({
				'fr': 'Le salon dans lequel les messages seront supprimés',
				'de': 'Der Kanal, in dem die Nachrichten gelöscht werden'
			})
			.addChannelTypes(ChannelType.GuildText),
		)
		.addUserOption(option => option
			.setName('user')
			.setDescription('The user whose messages will be deleted')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur dont les messages seront supprimés',
				'de': 'Der Benutzer, dessen Nachrichten gelöscht werden'
			}),
		);

	/**
	 * Deletes the specified number of messages from a channel, handling both bulk-deletable and older messages.
	 * @param _client - The bot client instance (unused in this command).
	 * @param interaction - The slash command interaction, used to read options and send replies.
	 * @param t - Translation function for localized replies.
	 */
	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const messageAmount = interaction.options.getInteger('amount');
		const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel || interaction.channel;
		const targetUser = interaction.options.getUser('user');

		if (!messageAmount || messageAmount < 1) {
			interaction.editReply({ content: t("command.purge.error_invalid_count") });
			return;
		}

		const messageList = await channel.messages.fetch({ limit: messageAmount });

		const filteredMessages = targetUser
			? messageList.filter(message => message.author.id === targetUser.id)
			: messageList;

		const [bulkDeletableMessages, notBulkDeletableMessages] = filteredMessages.partition(message => message.bulkDeletable);

		for (const message of notBulkDeletableMessages) {
			if (message instanceof Message) {
				message.delete();
			}
		}
		channel.bulkDelete(bulkDeletableMessages);

		const successKey = targetUser ? "command.purge.success_user" : "command.purge.success";
		interaction.editReply({ content: t(successKey, { amount: filteredMessages.size, channel, user: targetUser }) });
	}

}