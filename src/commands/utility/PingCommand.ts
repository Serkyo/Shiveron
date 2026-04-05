import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export default class PingCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong !')
		.setDescriptionLocalizations({
			'fr': 'Réponds avec Pong !',
			'de': 'Antwortet mit Pong!'
		})
		.setContexts(InteractionContextType.Guild);

	/**
	 * Replies with the bot's current WebSocket latency.
	 * @param client - The bot client instance, used to read `client.ws.ping`.
	 * @param interaction - The slash command interaction used to send the reply.
	 * @param t - Translation function for the localized pong reply.
	 */
	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		interaction.reply(t('command.ping.success', { latency: client.ws.ping }));
		// interaction.reply(`🏓 Pong ! Latency is ${client.ws.ping}ms.`);
	}
}
