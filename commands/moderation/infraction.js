const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, EmbedBuilder, time, MessageFlags } = require('discord.js');
const infraction = require('../../models/infraction');
const pagination = require('../../utils/pagination');

module.exports = {
	data: new SlashCommandBuilder()
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
				.setDescription('The id of the infraction to remove'),
			),
		),
	async execute(interaction) {
		const selectedOption = interaction.options.getSubcommand();
		if (selectedOption == 'list') {
			const target = interaction.options.getMember('member');
			const embeds = [];
			const infractionList = await infraction.findAll({ where: { userId: target.id, guildId: interaction.guildId } });

			if (infractionList.length != 0) {
				const nbWarns = await infraction.count({ where: { userId: target.id, guildId: interaction.guildId, type: 'Warn' } });

				const nbTimeout = await infraction.count({ where: { userId: target.id, guildId: interaction.guildId, type: 'Timeout' } });

				const nbKick = await infraction.count({ where: { userId: target.id, guildId: interaction.guildId, type: 'Kick' } });

				const nbBan = await infraction.count({ where: { userId: target.id, guildId: interaction.guildId, type: 'Ban' } });

				let counter = 0;
				let embed = new EmbedBuilder()
					.setTitle(`Infractions of ${target.displayName}`)
					.setDescription(`⚠️ **${nbWarns}** Warns\n⏳ **${nbTimeout}** Timeout\n🚫 **${nbKick}** Kick\n🔨 **${nbBan}** Ban`)
					.setColor('#46d8ef')
					.setThumbnail(target.displayAvatarURL());

				infractionList.forEach(async (row, index) => {
					infractionDate = new Date(row.get('createdAt'));
					stringValue = `📌 Infraction ID (**${row.get('id')}**) - Type : **${row.get('type')}**\n👤 Issued by ${await interaction.guild.members.fetch(row.get('enforcerId'))}`;

					if (row.get('ended') == false) {
						stringValue += `\n📅 Ending ${time(row.get('endDate'), 'R')}`;
					}
					if (row.get('reason') != null) {
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
					if (counter >= 5 || index == infractionList.length - 1) {
						embeds.push(embed);
						embed = new EmbedBuilder()
							.setTitle(`Infractions of ${target.displayName}`)
							.setDescription(`⚠️ **${nbWarns}** Warns\n⏳ **${nbTimeout}** Timeout\n🚫 **${nbKick}** Kick\n🔨 **${nbBan}** Ban`)
							.setColor('#46d8ef')
							.setThumbnail(target.displayAvatarURL());
						counter = 0;
					}
				});
				await pagination(interaction, embeds);
			}
			else {
				return interaction.reply({ flags: MessageFlags.Ephemeral, content: `${target} does not have any infraction` });
			}
		}
		else if (selectedOption == 'remove') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const target = interaction.options.getMember('member');
			const infractionId = interaction.options.getInteger('id');

			const lineToRemove = await infraction.findAll({ where : { id: infractionId, userId: target.id, guildId: interaction.guildId } });

			if (lineToRemove.length != 0) {
				await infraction.destroy({ where: { id: infractionId, userId: target.id, guildId: interaction.guildId } });
				return interaction.editReply({ content: `The infraction n°${infractionId} of ${target} was successfully removed from the database` });
			}
			return interaction.editReply({ content: `The infraction n°${infractionId} for ${target} does not exist` });
		}
	},
};