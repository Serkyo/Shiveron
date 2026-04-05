import { GuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { interpolate } from '../utils/formatters.js';

/** Fires when a new member joins a guild. Sends a configured join message if one is set. */
export default class GuildMemberAddEvent extends BaseEvent<'guildMemberAdd'> {
	public readonly name = 'guildMemberAdd';
	public once = false;

	/**
	 * Sends an interpolated join message to the configured join channel, if configured for the guild.
	 * @param client - The bot client instance.
	 * @param member - The GuildMember who just joined.
	 */
	public async execute(client: ShiveronClient, member: GuildMember): Promise<void> {
		try {
			const currentGuild = await client.guildSettingsService.createOrGetGuildSettings(member.guild.id);

			if (currentGuild.joinChannelId) {
				const joinChannel = await member.guild.channels.fetch(currentGuild.joinChannelId) as TextChannel;

				joinChannel.send(interpolate(currentGuild.joinMessage!, {
					user: member,
					server: member.guild,
					memberCount: member.guild.memberCount,
				}));

				client.logger.debug(`Processed guild member ${member.id} arrival in ${member.guild.id}`);
			}
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}

}