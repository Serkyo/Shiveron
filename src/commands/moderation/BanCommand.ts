import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags, GuildMember, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';
import { timeFromString } from '../../utils/formatters.js';

export default class BanCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Bans a member from the server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to ban')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('duration')
			.setDescription('The duration of the ban (amount followed by suffixes min,h,d,m or y)'),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the ban'),
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const timeString = await interaction.options.getString('duration');
		const reason = await interaction.options.getString('reason') || 'No reason provided';

		if (!validateAuthor(interaction, target, author, ModerationAction.BAN)) {
			return;
		}

		let bantime = 0;
		if (timeString) {
			try {
				bantime = timeFromString(timeString) as number;
			}
			catch (error) {
				interaction.editReply({ content: 'The time must be an integer greater or equal to 1 and must end with one of the following values : "min", "h", "d", "m" or "y"' });
				return;
			}
		}

		const endDateObject = new Date(Date.now() + bantime);
		try {
			let botReply;
			if (bantime != 0) {
				client.infractionService.createInfraction({
					userId: target!.id,
					guildId: interaction.guildId as string,
					enforcerId: author.id,
					type: ModerationAction.BAN,
					reason: reason,
					endDate: endDateObject,
					ended: false,
				});
				botReply = `${target} was banned from the server until ${time(endDateObject)}`;
			}
			else {
				client.infractionService.createInfraction({
					userId: target!.id,
					guildId: interaction.guildId!,
					enforcerId: author.id,
					type: ModerationAction.BAN,
					reason: reason,
				});
				botReply = `${target} was permanently banned from the server`;
			}
			target!.ban({ reason: reason });
			interaction.editReply({ content: botReply });
		}
		catch (error) {
			client.logger.error(`Failed to ban user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}