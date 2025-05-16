const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags, time } = require('discord.js');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('timeout')
		.setDescription('Timeout a member from the server. Default time is one hour')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to timeout')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('time')
			.setDescription('The duration of the timeout (amount followed by suffixes min,h or d). Max amount is 28 days'),
		)
		.addStringOption(option => option
			.setName('reason')
			.setDescription('The reason of the timeout'),
		),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = interaction.options.getMember('member');
		const timeString = interaction.options.getString('time');

		const reason = interaction.options.getString('reason');
		const idMax = await infraction.max('id', { where: { guildId: interaction.guildId, userId: target.id } });

		if (target.id == interaction.member.id) {
			return interaction.editReply({ content: 'You cannot timeout yourself' });
		}
		if (target.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.editReply({ content: 'I cannot timeout this member' });
		}
		if (interaction.member.roles.highest.comparePositionTo(target.roles.highest) < 0) {
			return interaction.editReply({ content: 'You cannot timeout this member, he has a higher role than you' });
		}

		let timeoutTime;
		if (timeString != null) {
			let slicedTime;
			if (timeString.slice(-3) == 'min') {
				slicedTime = timeString.slice(0, -3);
				timeoutTime = slicedTime * 60000;
			}
			else {
				slicedTime = timeString.slice(0, -1);
				if (!isNaN(Number(slicedTime))) {
					slicedTime = parseInt(slicedTime);
					switch (timeString.slice(-1)) {
					case 'h':
						if (slicedTime > 672) {
							timeoutTime = 2419200000;
						}
						else {
							timeoutTime = slicedTime * 3600000;
						}
						break;
					case 'd':
						if (slicedTime > 28) {
							timeoutTime = 2419200000;
						}
						else {
							timeoutTime = slicedTime * 86400000;
						}
						break;
					default:
						return interaction.editReply({ content: 'The time format must be the amount followed by :\n - min for minutes\n - h for hours\n - d for days\n - m for months\n - y for years' });
					}
				}
				else {
					return interaction.editReply({ content: 'The time format must be the amount followed by :\n - h for hours\n - d for days\n - m for months\n - y for years' });
				}
			}
		}
		else {
			timeoutTime = 3600000;
		}
		endDateObject = new Date(Date.now() + timeoutTime);
		try {
			await infraction.create({
				id: idMax + 1,
				userId: target.id,
				guildId: interaction.guildId,
				enforcerId: interaction.member.id,
				type: 'Timeout',
				reason: reason,
				endDate: endDateObject,
				ended: false,
			});
			await target.timeout(timeoutTime, reason);
			return interaction.editReply({ content: `${target} was timed out of the server until ${time(endDateObject)}` });
		}
		catch (error) {
			console.log(`An error occured while inserting into the database : ${error}`);
			return interaction.editReply({ content: 'There was an error while trying to create a new infraction' });
		}
	},
};