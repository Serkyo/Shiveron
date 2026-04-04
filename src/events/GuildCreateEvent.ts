import { Guild } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

/** Fires when the bot joins a new guild. Ensures a settings row exists for that guild. */
export default class GuildCreateEvent extends BaseEvent<'guildCreate'> {
	public readonly name = 'guildCreate';
	public once = false;

	/**
	 * Creates default guild settings for the newly joined guild if they don't already exist.
	 * @param client - The bot client instance.
	 * @param guild - The Guild object representing the server the bot just joined.
	 */
	public async execute(client: ShiveronClient, guild: Guild): Promise<void> {
		try {
			client.guildSettingsService.createOrGetGuildSettings(guild.id);
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}