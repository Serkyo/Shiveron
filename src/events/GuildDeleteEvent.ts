import { Guild } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

/** Fires when the bot is removed from a guild. Cleans up that guild's settings. */
export default class GuildDeleteEvent extends BaseEvent<'guildDelete'> {
	public readonly name = 'guildDelete';
	public once = false;

	/**
	 * Deletes the guild settings row for the guild the bot was removed from.
	 * @param client - The bot client instance.
	 * @param guild - The Guild object representing the server the bot left.
	 */
	public async execute(client: ShiveronClient, guild: Guild): Promise<void> {
		try {
			client.guildSettingsService.deleteGuildSettings(guild.id);
			client.logger.debug(`Processed guild leave from ${guild.id}`);
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}