import { GuildMember, TextChannel } from 'discord.js';
import { BaseEvent } from '../core/BaseEvent.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { GuildSettingsService } from '../services/GuildSettingsService.js';
import { InterpolateUtils } from '../utils/InterpolateUtils.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';

export default class GuildMemberAddEvent extends BaseEvent<'guildMemberAdd'> {
	public readonly name = 'guildMemberAdd';
	public once = false;

	public async execute(_client: ShiveronClient, member: GuildMember): Promise<void> {
		try {
			const [currentGuild] = await GuildSettingsService.createOrGetGuildSettings(member.guild.id);

			if (currentGuild.joinChannelId != null) {
				const joinChannel = await member.guild.channels.fetch(currentGuild.joinChannelId) as TextChannel;

				await joinChannel.send(InterpolateUtils.interpolate(currentGuild.joinMessage!, {
					user: member,
					server: member.guild,
					memberCount: member.guild.memberCount,
				}));

				ShiveronLogger.debug(`Processed guild member ${member.id} arrival in ${member.guild.id}`);
			}
		}
		catch (error) {
			ShiveronLogger.error(`Failed to process ${this.name} : ${error}`);
		}
	}

}