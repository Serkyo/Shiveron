import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, InteractionContextType, MessageFlags, GuildMember, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';
import { DEFAULT_TIMEOUT_MS, DISCORD_MAX_TIMEOUT_MS } from '../../utils/constants.js';
import { timeFromString } from '../../utils/formatters.js';

export default class TimeoutCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('timeout')
		.setDescription('Timeout a member from the server. Default time is 1 hour.')
		.setDescriptionLocalizations({
			'fr': 'Exclue temporairement un membre du serveur. La durée par défaut est de 1 heure.',
			'de': 'Schließt ein Mitglied vorübergehend vom Server aus. Standarddauer ist 1 Stunde.'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to timeout')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur à exclure',
				'de': 'Der auszuschließende Benutzer'
			})
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('time')
			.setDescription('The duration of the timeout (amount followed by suffixes min,h or d). Max amount is 28 days')
			.setDescriptionLocalizations({
				'fr': 'La durée de l\'exclusion (montant suivi d\'un suffixe : min,h ou d). La durée maximale est de 28 jours',
				'de': 'Die Dauer des Timeouts (Betrag gefolgt von Suffixen min,h oder d). Maximal 28 Tage'
			})
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the timeout')
			.setDescriptionLocalizations({
				'fr': 'La raison de l\'exclusion',
				'de': 'Der Grund für den Timeout'
			})
		);

	/**
	 * Times out the specified member for a given duration (default 1 hour), and records the infraction.
	 * @param client - The bot client instance.
	 * @param interaction - The slash command interaction, used to read options and send replies.
	 * @param t - Translation function for localized replies.
	 */
	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const timeString = interaction.options.getString('time');
		const reason = await interaction.options.getString('reason');

		if (!validateAuthor(interaction, target, author, ModerationAction.TIMEOUT)) {
			return;
		}

		let timeoutTime = DEFAULT_TIMEOUT_MS;
		if (timeString) {
			try {
				timeoutTime = timeFromString(timeString) as number;
				if (timeoutTime > DISCORD_MAX_TIMEOUT_MS) {
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