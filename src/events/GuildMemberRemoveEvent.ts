import { GuildMember, type PartialGuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { interpolate } from '../utils/formatters.js';

/** Fires when a member leaves or is removed from a guild. Sends a configured leave message if one is set. */
export default class GuildMemberRemoveEvent extends BaseEvent<'guildMemberRemove'> {
	public readonly name = 'guildMemberRemove';
	public once = false;

	/**
	 * Sends an interpolated leave message to the configured leave channel, if configured for the guild.
	 * @param client - The bot client instance.
	 * @param member - The GuildMember (or PartialGuildMember) who left the server.
	 */
	public async execute(client: ShiveronClient, member: GuildMember | PartialGuildMember): Promise<void> {
		try {
			const [currentGuild] = await client.guildSettingsService.createOrGetGuildSettings(member.guild.id);

			if (currentGuild.leaveChannelId) {
				const leaveChannel = await member.guild.channels.fetch(currentGuild.leaveChannelId) as TextChannel;

				leaveChannel.send(interpolate(currentGuild.leaveMessage!, {
					user: member,
					server: member.guild,
					memberCount: member.guild.memberCount,
				}));

				client.logger.debug(`Processed guild member ${member.id} departure in ${member.guild.id}`);
			}
		}
		catch (error) {
			client.logger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}