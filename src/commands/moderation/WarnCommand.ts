import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags, GuildMember } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';

export default class WarnCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Warn a member')
		.setDescriptionLocalizations({
			'fr': 'Avertis un membre'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to warn')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur à avertis'
			})
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the warn')
			.setDescriptionLocalizations({
				'fr': 'La raison de l\'avertissement'
			})
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = interaction.options.getMember('member') as GuildMember | null;;
		const reason = interaction.options.getString('reason');

		if (!validateAuthor(interaction, target, author, ModerationAction.BAN)) {
			return;
		}

		try {
			const warnCount = await client.infractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.WARN) + 1;

			client.infractionService.createInfraction({
				userId: target!.id,
				guildId: interaction.guildId!,
				enforcerId: author.id,
				type: ModerationAction.WARN,
				reason: reason,
			});

			const [currentGuild] = await client.guildSettingsService.createOrGetGuildSettings(interaction.guildId!);

			if (currentGuild.maxWarnings == warnCount) {
				client.infractionService.createInfraction({
					userId: target!.id,
					guildId: interaction.guildId!,
					enforcerId: author.id,
					type: ModerationAction.BAN,
					reason: t("command.warn.ban_reason"),
				});
				target?.ban({ reason: t("command.warn.ban_reason") });
				interaction.editReply({ content: t("command.warn.success_banned", { user: target }) });
			}
			else {
				interaction.editReply({ content: t("command.warn.success", { user: target, warnCount }) });
			}
		}
		catch (error) {
			client.logger.error(`Failed to warn user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}