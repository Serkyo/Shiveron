import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, InteractionContextType, MessageFlags, GuildMember, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';
import { timeFromString } from '../../utils/formatters.js';

export default class TimeoutCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('timeout')
		.setDescription('Timeout a member from the server. Default time is 1 hour.')
		.setDescriptionLocalizations({
			'fr': 'Exclue temporairement un membre du serveur. La durée par défaut est de 1 heure.'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to timeout')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur à exclure'
			})
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('time')
			.setDescription('The duration of the timeout (amount followed by suffixes min,h or d). Max amount is 28 days')
			.setDescriptionLocalizations({
				'fr': 'La durée de l\'exclusion (montant suivi d\'un suffixe : min,h ou d). La durée maximale est de 28 jours'
			})
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the timeout')
			.setDescriptionLocalizations({
				'fr': 'La raison de l\'exclusion'
			})
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const timeString = interaction.options.getString('time');
		const reason = await interaction.options.getString('reason');

		if (!validateAuthor(interaction, target, author, ModerationAction.TIMEOUT)) {
			return;
		}

		let timeoutTime = 3600000;
		if (timeString) {
			try {
				timeoutTime = timeFromString(timeString) as number;
				if (timeoutTime > 2419200000) {
					interaction.editReply({ content: t("command.timeout.error_max_limit") });
					return;
				}
			}
			catch (error) {
				interaction.editReply({ content: t("error.invalid_time_format") });
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

			if (reason) {
				target!.timeout(timeoutTime, reason);
			}
			else {
				target!.timeout(timeoutTime);
			}
			interaction.editReply({ content: t("command.timeout.success", { user: target, endDate: time(endDateObject) }) });
		}
		catch (error) {
			client.logger.error(`Failed to timeout user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}