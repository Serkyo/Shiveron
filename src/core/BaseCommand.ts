import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder, type SlashCommandOptionsOnlyBuilder, type SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { ShiveronClient } from './ShiveronClient.js';

/** Base class for all slash commands. Each command must extend this and implement its data and execute method. */
export abstract class BaseCommand {
	public abstract data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

	/**
	 * Executes the command logic.
	 * @param client - The bot client instance.
	 * @param interaction - The slash command interaction that triggered this command.
	 * @param t - Translation function: takes a locale key and optional interpolation variables, returns the localized string.
	 */
	public abstract execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void>;

	/**
	 * Handles autocomplete interactions for this command. Override in commands that use autocomplete options.
	 * @param client - The bot client instance.
	 * @param interaction - The autocomplete interaction to respond to.
	 */
	public autocomplete?(client: ShiveronClient, interaction: AutocompleteInteraction): Promise<void>;
}
