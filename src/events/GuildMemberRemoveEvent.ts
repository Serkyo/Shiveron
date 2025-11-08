import { GuildMember, PartialGuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { InterpolateUtils } from '../utils/InterpolateUtils.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';

export class GuildMemberRemoveEvent extends BaseEvent<'guildMemberRemove'> {
	public readonly name = 'guildMemberRemove';
	public once = false;

	public async execute(_client: ShiveronClient, member: GuildMember | PartialGuildMember): Promise<void> {
		const [currentGuild] = await GuildSettingsService.createOrGetGuildSettings(member.guild.id);

		if (currentGuild.leaveChannelId != null) {
			const leaveChannel = await member.guild.channels.fetch(currentGuild.leaveChannelId) as TextChannel;

			await leaveChannel.send(InterpolateUtils.interpolate(currentGuild.leaveChannelId!, {
				user: member,
				server: member.guild,
				memberCount: member.guild.memberCount,
			}));

			ShiveronLogger.debug(`Processed guild member ${member.id} arrival in ${member.guild.id}`);
		}
	}
}