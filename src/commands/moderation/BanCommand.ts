import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags, GuildMember, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';
import { timeFromString } from '../../utils/formatters.js';

export default class BanCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Bans a member from the server')
		.setDescriptionLocalizations({
			'fr': 'Bannis un membre du serveur'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to ban')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur à bannir'
			})
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('duration')
			.setDescription('The duration of the ban (amount followed by suffix : min,h,d,m or y)')
			.setDescriptionLocalizations({
				'fr': 'La durée du banissement (montant suivi d\'un suffixe : min,h,d,m ou y)'
			})
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the ban')
			.setDescriptionLocalizations({
				'fr': 'La raison du banissement'
			})
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const timeString = await interaction.options.getString('duration');
		let reason = await interaction.options.getString('reason');

		if (!validateAuthor(interaction, target, author, ModerationAction.BAN)) {
			return;
		}

		let bantime = 0;
		if (timeString) {
			try {
				bantime = timeFromString(timeString) as number;
			}
			catch (error) {
				interaction.editReply({ content: t("error.invalid_time_format") });
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
				botReply = t("command.ban.success_temporary", { user: target, endDate: time(endDateObject)});
			}
			else {
				client.infractionService.createInfraction({
					userId: target!.id,
					guildId: interaction.guildId!,
					enforcerId: author.id,
					type: ModerationAction.BAN,
					reason: reason,
				});
				botReply = t("command.ban.success_permanent", { user: target });
			}

			if (reason) {
				target!.ban({ reason: reason });
			}
			else {
				target!.ban();
			}
			interaction.editReply({ content: botReply });
		}
		catch (error) {
			client.logger.error(`Failed to ban user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}