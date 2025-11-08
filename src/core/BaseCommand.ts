import { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { ShiveronClient } from './ShiveronClient.js';

export abstract class BaseCommand {
	public abstract data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

	public abstract execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void>;
}
