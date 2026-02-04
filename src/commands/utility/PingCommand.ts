import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export default class PingCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong !')
		.setDescriptionLocalizations({
			'fr': 'Réponds avec Pong !'
		})
		.setContexts(InteractionContextType.Guild);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		interaction.reply(t('command.ping.success', { latency: client.ws.ping }));
		// interaction.reply(`🏓 Pong ! Latency is ${client.ws.ping}ms.`);
	}
}
