const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
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
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = interaction.options.getMember('member');
		const reason = interaction.options.getString('reason');
		const idMax = await infraction.max('id', { where: { guildId: interaction.guildId, userId: target.id } });

		if (target.id == interaction.member.id) {
			return interaction.editReply({ content: 'You cannot kick yourself' });
		}
		if (target.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.editReply({ content: 'I cannot kick this member' });
		}
		if (interaction.member.roles.highest.comparePositionTo(target.roles.highest) < 0) {
			return interaction.editReply({ content: 'You cannot kick this member, he has a higher role than you' });
		}

		try {
			await infraction.create({
				id: idMax + 1,
				userId: target.id,
				guildId: interaction.guildId,
				enforcerId: interaction.member.id,
				type: 'Kick',
				reason: reason,
				endDate: null,
				ended: null,
			});
			await target.kick(reason);
			return interaction.editReply({ content: `${target} was kicked from the server` });
		}
		catch (error) {
			console.log(`An error occured while inserting into the database : ${error}`);
			return interaction.editReply({ content: 'There was an error while trying to create a new infraction' });
		}
	},
};