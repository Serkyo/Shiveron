const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Unban an user from the server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addStringOption(option => option
			.setName('user')
			.setDescription('The username of the user to unban')
			.setRequired(true),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const targetUsername = interaction.options.getString('user');
		const banList = await interaction.guild.bans.fetch();
		const targetBan = await banList.find(user => user.user.username == targetUsername);
		if (targetBan != undefined) {
			const currentDate = new Date(Date.now());
			const latestBanId = await infraction.max('id', { where: { userId: targetBan.user.id, guildId: interaction.guildId, type: 'Ban' } });
			await interaction.guild.bans.remove(targetBan.user);
			await infraction.update({ ended: true, endDate: currentDate }, { where: { id: latestBanId, userId: targetBan.user.id, guildId: interaction.guildId } });
			return interaction.editReply({ content: `${targetBan.user} was unbanned from the server` });
		}
		else {
			return interaction.editReply({ content: `${targetUsername} does not exist in the ban list` });
		}
	},
};