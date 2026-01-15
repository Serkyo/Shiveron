import { GuildMember, type PartialGuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';
import { interpolate } from '../utils/formatters.js';

export default class GuildMemberRemoveEvent extends BaseEvent<'guildMemberRemove'> {
	public readonly name = 'guildMemberRemove';
	public once = false;

	public async execute(_client: ShiveronClient, member: GuildMember | PartialGuildMember): Promise<void> {
		try {
			const [currentGuild] = await GuildSettingsService.createOrGetGuildSettings(member.guild.id);

			if (currentGuild.leaveChannelId != null) {
				const leaveChannel = await member.guild.channels.fetch(currentGuild.leaveChannelId) as TextChannel;

				await leaveChannel.send(interpolate(currentGuild.leaveMessage!, {
					user: member,
					server: member.guild,
					memberCount: member.guild.memberCount,
				}));

				ShiveronLogger.debug(`Processed guild member ${member.id} departure in ${member.guild.id}`);
			}
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}
}