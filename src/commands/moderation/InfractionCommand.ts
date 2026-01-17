import { SlashCommandBuilder, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, GuildMember, EmbedBuilder, time } from 'discord.js';
import { BaseCommand } from '../../core/BaseCommand.js';
import { ShiveronClient } from '../../core/ShiveronClient.js';
import { InfractionService } from '../../services/InfractionService.js';
import { paginateFromInteraction } from '../../utils/discord/pagination.js';
import { ModerationAction, validateTarget } from '../../utils/discord/moderation.js';

export default class InfractionCommand extends BaseCommand {
	public data = new SlashCommandBuilder()
		.setName('infraction')
		.setDescription('Manage infractions')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addSubcommand(subCommand => subCommand
			.setName('list')
			.setDescription('List all infractions of an user')
			.addUserOption(option => option
				.setName('member')
				.setDescription('The user to get infractions for')
				.setRequired(true),
			),
		)
		.addSubcommand(subCommand => subCommand
			.setName('remove')
			.setDescription('Remove an infraction from an user')
			.addUserOption(option => option
				.setName('member')
				.setDescription('The user from whom you want to remove an infraction')
				.setRequired(true),
			)
			.addIntegerOption(option => option
				.setName('id')
				.setDescription('The id of the infraction to remove')
				.setRequired(true),
			),
		);

	public async execute(_client: ShiveronClient, interaction: ChatInputCommandInteraction): Promise<void> {
		await interaction.deferReply();

		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'list') {
			this.infractionList(interaction);
		}
		else {
			this.infractionRemove(interaction);
		}
	}

	private async infractionList(interaction: ChatInputCommandInteraction): Promise<void> {
		const target = interaction.options.getMember('member') as GuildMember | null;
		const embeds: EmbedBuilder[] = [];

		if (!validateTarget(interaction, target)) {
			return;
		}

		const infractionList = await InfractionService.getUserInfractions(target!.id, interaction.guildId!);

		if (infractionList.length != 0) {
			const nbWarns = await InfractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.WARN);

			const nbTimeout = await InfractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.TIMEOUT);

			const nbKick = await InfractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.KICK);

			const nbBan = await InfractionService.countUserInfractionsByType(target!.id, interaction.guildId!, ModerationAction.BAN);

			let counter = 0;
			let embed = new EmbedBuilder()
				.setTitle(`Infractions of ${target!.displayName}`)
				.setDescription(`⚠️ **${nbWarns}** Warns\n⏳ **${nbTimeout}** Timeout\n🚫 **${nbKick}** Kick\n🔨 **${nbBan}** Ban`)
				.setColor('#46d8ef')
				.setThumbnail(target!.displayAvatarURL());

			for (let i = 0; i < infractionList.length; i++) {
				const row = infractionList[i]!;
				const infractionDate = new Date(row.get('createdAt'));

				let stringValue = `📌 Infraction ID (**${row.get('id')}**) - Type : **${row.get('type')}**\n👤 Issued by ${await interaction.guild!.members.fetch(row.get('enforcerId'))}`;

				if (row.get('ended') == false) {
					stringValue += `\n📅 Ending ${time(row.get('endDate')!, 'R')}`;
				}
				if (row.get('reason')) {
					stringValue += `\n\`\`\`\n${row.get('reason')}\n\`\`\``;
				}
				else {
					stringValue += '\n```\nNo reason given\n```';
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
						.setTitle(`Infractions of ${target!.displayName}`)
						.setDescription(`⚠️ **${nbWarns}** Warns\n⏳ **${nbTimeout}** Timeout\n🚫 **${nbKick}** Kick\n🔨 **${nbBan}** Ban`)
						.setColor('#46d8ef')
						.setThumbnail(target!.displayAvatarURL());
					counter = 0;
				}
			}

			await paginateFromInteraction(interaction, embeds, 60000);
		}
		else {
			await interaction.editReply({ content: `${target} does not have any infraction` });
		}
	}

	private async infractionRemove(interaction: ChatInputCommandInteraction): Promise<void> {
		const target = interaction.options.getMember('member') as GuildMember | null;
		const infractionId = interaction.options.getInteger('id');

		if (!validateTarget(interaction, target)) {
			return;
		}

		const removedLine = await InfractionService.deleteInfraction(infractionId!);

		if (removedLine) {
			await interaction.editReply({ content: `The infraction n°${infractionId} of ${target} was successfully removed from the database` });
		}
		else {
			await interaction.editReply({ content: `The infraction n°${infractionId} for ${target} does not exist` });
		}
	}
}