import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';

export class PingCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong !')
		.setContexts(InteractionContextType.Guild);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.reply(`🏓 Pong ! Latency is ${client.ws.ping}ms.`);
	}
}
