import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, InteractionContextType, PermissionFlagsBits, MessageFlags, type GuildTextBasedChannel, Message } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export default class PurgeCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('purge')
		.setDescription('Removes a number of messages from a channel')
		.setDescriptionLocalizations({
			'fr': 'Supprime un nombre de messages d\'un salon'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.addIntegerOption(option => option
			.setName('amount')
			.setDescription('The amount of messages to delete')
			.setDescriptionLocalizations({
				'fr': 'Le nombre de messages à supprimer'
			})
			.setRequired(true),
		)
		.addChannelOption(option => option
			.setName('channel')
			.setDescription('The channel in which the messages will be deleted')
			.setDescriptionLocalizations({
				'fr': 'Le salon dans lequel les messages seront supprimés'
			})
			.addChannelTypes(ChannelType.GuildText),
		);

	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const messageAmount = interaction.options.getInteger('amount');
		const channel = interaction.options.getChannel('channel') as GuildTextBasedChannel || interaction.channel;

		if (!messageAmount || messageAmount < 1) {
			interaction.editReply({ content: t("command.purge.error_invalid_count") });
			return;
		}

		const messageList = await channel.messages.fetch({ limit: messageAmount });

		const [bulkDeletableMessages, notBulkDeletableMessages] = messageList.partition(message => message.bulkDeletable);

		for (const message of notBulkDeletableMessages) {
			if (message instanceof Message) {
				message.delete();
			}
		}
		channel.bulkDelete(bulkDeletableMessages);

		interaction.editReply({ content: t("command.purge.success", { amount: messageAmount, channel }) });
	}

}