import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, GuildMember, EmbedBuilder, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { paginateFromInteraction } from '../../utils/discord/pagination.js';
import { ModerationAction, validateTarget } from '../../utils/discord/moderation.js';

export default class InfractionCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('infraction')
		.setDescription('Manage infractions')
		.setDescriptionLocalizations({
			'fr': 'Gérer les infractions'
		})
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand(subCommand => subCommand
			.setName('list')
			.setDescription('List all infractions of an user')
			.setDescriptionLocalizations({
				'fr': 'Liste toutes les infractions d\'un utilisateur'
			})
			.addUserOption(option => option
				.setName('member')
				.setDescription('The user to get infractions for')
				.setDescriptionLocalizations({
					'fr': 'L\'utilisateur dont vous voulez voir les infractions'
				})
				.setRequired(true),
			),
		)
		.addSubcommand(subCommand => subCommand
			.setName('remove')
			.setDescription('Remove an infraction from an user')
			.setDescriptionLocalizations({
				'fr': 'Retirer une infraction d\'un utilisateur'
			})
			.addUserOption(option => option
				.setName('member')
				.setDescription('The user from whom you want to remove an infraction')
				.setDescriptionLocalizations({
					'fr': 'L\'utilisateur dont vous voulez retirer une infraction'
				})
				.setRequired(true),
			)
			.addIntegerOption(option => option
				.setName('id')
				.setDescription('The id of the infraction to remove')
				.setDescriptionLocalizations({
					'fr': 'L\'id de l\'infraction à retirer'
				})
				.setRequired(true),
			),
		);

	public async execute(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		await interaction.deferReply();

		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'list') {
			this.infractionList(client, interaction, t);
		}
		else {
			this.infractionRemove(client, interaction, t);
		}
	}

	private async infractionList(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		const target = interaction.options.getMember('member') as GuildMember | null;
		const embeds: EmbedBuilder[] = [];

		if (!validateTarget(interaction, target)) {
			return;
		}

		const infractionList = await client.infractionService.getUserInfractions(target!.id, interaction.guildId!);

		if (infractionList.length != 0) {
			const warnCount = await client.infractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.WARN);

			const timeoutCount = await client.infractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.TIMEOUT);

			const kickCount = await client.infractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.KICK);

			const banCount = await client.infractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.BAN);

			let counter = 0;
			let embed = new EmbedBuilder()
				.setTitle(t("command.infraction.list.embed.title", { user: target!.displayName }))
				.setDescription(t("command.infraction.list.embed.description", { warnCount, timeoutCount, kickCount, banCount }))
				.setColor('#46d8ef')
				.setThumbnail(target!.displayAvatarURL());

			for (let i = 0; i < infractionList.length; i++) {
				const row = infractionList[i]!;
				const infractionDate = new Date(row.get('createdAt'));

				let stringValue = t("command.infraction.list.embed.row_main", {infractionId: row.get('id'), type: row.get('type'), enforcerId: await interaction.guild!.members.fetch(row.get('enforcerId'))});

				if (row.get('ended') == false) {
					stringValue += t("command.infraction.list.embed.row_expiration", { endDate: time(row.get('endDate')!, 'R')});
				}
				if (row.get('reason')) {
					stringValue += `\n\`\`\`\n${row.get('reason')}\n\`\`\``;
				}
				else {
					stringValue += t("command.infraction.list.embed.row_no_reason");
				}

				embed.addFields({
					name: time(infractionDate, 'F'),
					value: stringValue,
					inline: false,
				});

				counter++;
				if (counter >= 5 || i == infractionList.length - 1) {
					embeds.push(embed);
					embed = new EmbedBuilder()
						.setTitle(t("command.infraction.list.embed.title", { user: target!.displayName }))
						.setDescription(t("command.infraction.list.embed.description", { warnCount, timeoutCount, kickCount, banCount }))
						.setColor('#46d8ef')
						.setThumbnail(target!.displayAvatarURL());
					counter = 0;
				}
			}

			paginateFromInteraction(client, interaction, embeds, 60000);
		}
		else {
			interaction.editReply({ content: t("command.infraction.list.empty", { user: target }) });
		}
	}

	private async infractionRemove(client: ShiveronClient, interaction: ChatInputCommandInteraction, t: (path: string, vars?: Record<string, any>) => string): Promise<void> {
		const target = interaction.options.getMember('member') as GuildMember | null;
		const infractionId = interaction.options.getInteger('id');

		if (!validateTarget(interaction, target)) {
			return;
		}

		const removedLine = await client.infractionService.deleteInfraction(infractionId!);

		if (removedLine) {
			interaction.editReply({ content: t("command.infraction.remove.success", { infractionId, user: target }) });
		}
		else {
			interaction.editReply({ content: t("command.infraction.remove.not_found", { infractionId, user: target }) });
		}
	}
}