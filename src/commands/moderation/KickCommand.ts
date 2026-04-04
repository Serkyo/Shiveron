import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { ModerationAction, validateAuthor } from '../../utils/discord/moderation.js';

export default class KickCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('kick')
		.setDescription('Kicks a member from the server')
		.setDescriptionLocalizations({
			'fr': 'Expulse un membre du serveur',
			'de': 'Kickt ein Mitglied vom Server'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to kick')
			.setDescriptionLocalizations({
				'fr': 'L\'utilisateur à expulser',
				'de': 'Der zu kickende Benutzer'
			})
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the kick')
			.setDescriptionLocalizations({
				'fr': 'La raison de l\'expulsion',
				'de': 'Der Grund für den Kick'
			})
		);

	/**
	 * Kicks the specified member from the guild and records the infraction.
	 * @param client - The bot client instance.
	 * @param interaction - The slash command interaction, used to read options and send replies.
	 * @param t - Translation function for localized replies.
	 */
	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const author = interaction.member as GuildMember;

		const target = await interaction.options.getMember('member') as GuildMember | null;
		const reason = await interaction.options.getString('reason');

		if (!validateAuthor(interaction, target, author, ModerationAction.KICK)) {
			return;
		}

		try {
			client.infractionService.createInfraction({
				userId: target!.id,
				guildId: interaction.guildId!,
				enforcerId: author.id,
				type: ModerationAction.KICK,
				reason: reason,
			});

			if (reason) {
				target!.kick(reason);
			}
			else {
				target!.kick();
			}
			interaction.editReply({ content: t("command.kick.success", { user: target }) });
		}
		catch (error) {
			client.logger.error(`Failed to kick user ${target} from guild ${interaction.guild!.name}`);
			throw error;
		}
	}
}