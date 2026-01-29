import { GuildMember, type PartialGuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { interpolate } from '../utils/formatters.js';

export default class GuildMemberRemoveEvent extends BaseEvent<'guildMemberRemove'> {
	public readonly name = 'guildMemberRemove';
	public once = false;

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