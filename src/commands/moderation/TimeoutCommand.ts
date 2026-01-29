import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, InteractionContextType, MessageFlags, GuildMember, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';
import { timeFromString } from '../../utils/formatters.js';

export default class TimeoutCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('timeout')
		.setDescription('Timeout a member from the server. time is one hour')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to timeout')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('time')
			.setDescription('The duration of the timeout (amount followed by suffixes min,h or d). Max amount is 28 days'),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the timeout'),
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const timeString = interaction.options.getString('time');
		const reason = await interaction.options.getString('reason') || 'No reason provided';

		if (!validateAuthor(interaction, target, author, ModerationAction.TIMEOUT)) {
			return;
		}

		let timeoutTime = 3600000;
		if (timeString) {
			try {
				timeoutTime = timeFromString(timeString) as number;
				if (timeoutTime > 2419200000) {
					interaction.editReply({ content: 'The maximum amount of  time for a timeout is 28 days.' });
					return;
				}
			}
			catch (error) {
				interaction.editReply({ content: 'The time must be an integer greater or equal to 1 and must end with one of the following values : "min", "h", "d", "m" or "y"' });
				return;
			}
		}

		const endDateObject = new Date(Date.now() + timeoutTime);
		try {
			client.infractionService.createInfraction({
				userId: target!.id,
				guildId: interaction.guildId as string,
				enforcerId: author.id,
				type: ModerationAction.TIMEOUT,
				reason: reason,
				endDate: endDateObject,
				ended: false,
			});
			target!.timeout(timeoutTime, reason);
			interaction.editReply({ content: `${target} was timed out of the server until ${time(endDateObject)}` });
		}
		catch (error) {
			client.logger.error(`Failed to timeout user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}