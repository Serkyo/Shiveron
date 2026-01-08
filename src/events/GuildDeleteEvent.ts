import { Guild } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';

export default class GuildDeleteEvent extends BaseEvent<'guildDelete'> {
	public readonly name = 'guildDelete';
	public once = false;

	public async execute(_client: ShiveronClient, guild: Guild): Promise<void> {
		try {
			await GuildSettingsService.deleteGuildSettings(guild.id);
			ShiveronLogger.debug(`Processed guild leave from ${guild.id}`);
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}