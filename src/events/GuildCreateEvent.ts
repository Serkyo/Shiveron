import { Guild } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

export default class GuildCreateEvent extends BaseEvent<'guildCreate'> {
	public readonly name = 'guildCreate';
	public once = false;

	public async execute(client: ShiveronClient, guild: Guild): Promise<void> {
		try {
			client.guildSettingsService.createOrGetGuildSettings(guild.id);
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}