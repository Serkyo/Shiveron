const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const guild = require('./../../models/guild');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
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
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = interaction.options.getMember('member');
		const reason = interaction.options.getString('reason');
		const nbInfractions = await infraction.count({ where: { guildId: interaction.guildId, userId: target.id } });

		if (target.id == interaction.member.id) {
			return interaction.editReply({ content: 'You cannot warn yourself' });
		}
		if (target.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.editReply({ content: 'I cannot warn this member' });
		}
		if (interaction.member.roles.highest.comparePositionTo(target.roles.highest) < 0) {
			return interaction.editReply({ content: 'You cannot warn this member, he has a higher role than you' });
		}

		try {
			await infraction.create({
				id: nbInfractions,
				userId: target.id,
				guildId: interaction.guildId,
				enforcerId: interaction.member.id,
				type: 'Warn',
				reason: reason,
				endDate: null,
				ended: null,
			});

			const nbWarnings = await infraction.count({ where: { guildId: interaction.guildId, userId: target.id, type: 'Warn' } });
			const currentGuild = await guild.findOne({ where: { guildId: interaction.guildId } });
			if (currentGuild) {
				if (currentGuild.nbWarningsMax == nbWarnings) {
					await infraction.create({
						id: nbInfractions + 1,
						userId: target.id,
						guildId: interaction.guildId,
						enforcerId: interaction.member.id,
						type: 'Ban',
						reason: 'Maximum number of warnings reached',
						endDate: null,
						ended: null,
					});
					await target.ban({ reason: 'Maximum number of warnings reached' });
					return interaction.editReply({ content: `${target} reached the maximum amount of warnings allowed, and was banned from the server` });
				}
			}
			return interaction.editReply({ content: `${target} was warned. They have been warned ${nbWarnings} times` });
		}
		catch (error) {
			console.log(`An error occured while inserting into the database : ${error}`);
			return interaction.editReply({ content: 'There was an error while trying to create a new infraction' });
		}
	},
};