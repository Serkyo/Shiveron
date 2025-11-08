import { Guild } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';

export default class GuildCreateEvent extends BaseEvent<'guildCreate'> {
	public readonly name = 'guildCreate';
	public once = false;

	public async execute(_client: ShiveronClient, guild: Guild): Promise<void> {
		try {
			await GuildSettingsService.createOrGetGuildSettings(guild.id);
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}