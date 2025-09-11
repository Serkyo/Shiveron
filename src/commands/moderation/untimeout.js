const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('untimeout')
		.setDescription('Untimeout an user from the server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to untimeout')
			.setRequired(true),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = interaction.options.getMember('member');
		const timeoutEndDate = target.communicationDisabledUntil;
		if (timeoutEndDate != null) {
			const currentDate = new Date(Date.now());
			const latestTimeoutId = await infraction.max('id', { where: { userId: target.id, guildId: interaction.guildId, type: 'Timeout' } });
			await target.timeout(null);
			await infraction.update({ ended: true, endDate: currentDate }, { where: { id: latestTimeoutId, userId: target.id, guildId: interaction.guildId } });
			return interaction.editReply({ content: `The timeout of ${target} was removed` });
		}
		else {
			return interaction.editReply({ content: `${target} is not timed out` });
		}
	},
};