import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, MessageFlags, GuildMember } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { GuildSettingsService } from '../../services/GuildSettingsService.js';
import { InfractionService } from '../../services/InfractionService.js';
import { ModerationUtils, ModerationAction } from '../../utils/discord/ModerationUtils.js';

export default class WarnCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('warn')
		.setDescription('Warn a member')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to warn')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the warn'),
		);

	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = interaction.options.getMember('member') as GuildMember | null;;
		const reason = await interaction.options.getString('reason') || 'No reason provided';

		if (!ModerationUtils.validateAuthor(interaction, target, author, ModerationAction.BAN)) {
			return;
		}

		try {
			await InfractionService.createInfraction({
				userId: target!.id,
				guildId: interaction.guildId!,
				enforcerId: author.id,
				type: ModerationAction.WARN,
				reason: reason,
			});

			const nbWarnings = await InfractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.WARN);
			const [currentGuild] = await GuildSettingsService.createOrGetGuildSettings(interaction.guildId!);

			if (currentGuild.nbWarningsMax == nbWarnings) {
				await InfractionService.createInfraction({
					userId: target!.id,
					guildId: interaction.guildId!,
					enforcerId: author.id,
					type: ModerationAction.BAN,
					reason: 'Maximum number of warnings reached',
				});
				await target?.ban({ reason: 'Maximum number of warnings reached' });
				await interaction.editReply({ content: `${target} reached the maximum amount of warnings allowed for this server, and was thus banned permanently` });
			}
			else {
				await interaction.editReply({ content: `${target} was warned. They have been warned ${nbWarnings} times` });
			}
		}
		catch (error) {
			console.log(`Failed to warn user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}