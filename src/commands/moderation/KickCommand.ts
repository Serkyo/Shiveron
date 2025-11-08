import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { InfractionService } from '../../services/InfractionService.js';
import { ModerationUtils, ModerationAction } from '../../utils/ModerationUtils.js';
import { ShiveronLogger } from '../../utils/ShiveronLogger.js';

export default class KickCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kicks a member from the server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to kick')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the kick'),
		);

	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const reason = await interaction.options.getString('reason') || 'No reason provided';

		if (!ModerationUtils.validateAuthor(interaction, target, author, ModerationAction.KICK)) {
			return;
		}

		try {
			await InfractionService.createInfraction({
				userId: target!.id,
				guildId: interaction.guildId!,
				enforcerId: author.id,
				type: ModerationAction.KICK,
				reason: reason,
			});
			await target!.kick(reason);
			await interaction.editReply({ content: `${target} was kicked from the server` });
		}
		catch (error) {
			ShiveronLogger.error(`Failed to kick user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}