import { GuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { interpolate } from '../utils/formatters.js';

/** Fires when a guild member's properties are updated. Sends a configured boost message when a member starts boosting. */
export default class GuildMemberUpdateEvent extends BaseEvent<'guildMemberUpdate'> {
	public readonly name = 'guildMemberUpdate';
	public once = false;

	public async execute(client: ShiveronClient, oldMember: GuildMember, newMember: GuildMember): Promise<void> {
		try {
			if (oldMember.premiumSince !== null || newMember.premiumSince === null) return;

			const guildSettings = await client.guildSettingsService.createOrGetGuildSettings(newMember.guild.id);

			if (guildSettings.boostChannelId && guildSettings.boostMessage) {
				const boostChannel = await newMember.guild.channels.fetch(guildSettings.boostChannelId) as TextChannel;

				boostChannel.send(interpolate(guildSettings.boostMessage, {
					user: newMember,
					server: newMember.guild,
				}));

				client.logger.debug(`Processed boost by ${newMember.id} in ${newMember.guild.id}`);
			}
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}
