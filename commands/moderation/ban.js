const { SlashCommandBuilder, InteractionContextType, PermissionFlagsBits, MessageFlags, time } = require('discord.js');
const infraction = require('./../../models/infraction');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Bans a member from the server')
		.setContexts(InteractionContextType.Guild)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.addUserOption(option => option
			.setName('member')
			.setDescription('The user to kick')
			.setRequired(true),
		)
		.addStringOption(option => option
			.setName('time')
			.setDescription('The duration of the ban (amount followed by suffixes h,d,m or y)'),
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
			return interaction.editReply({ content: 'You cannot ban yourself' });
		}
		if (target.permissions.has(PermissionFlagsBits.Administrator)) {
			return interaction.editReply({ content: 'I cannot ban this member' });
		}
		if (interaction.member.roles.highest.comparePositionTo(target.roles.highest) < 0) {
			return interaction.editReply({ content: 'You cannot ban this member, he has a higher role than you' });
		}

		let banTime;
		if (timeString != null) {
			let slicedTime = timeString.slice(0, -1);
			if (!isNaN(Number(slicedTime))) {
				slicedTime = parseInt(slicedTime);
				switch (timeString.slice(-1)) {
				case 'h':
					banTime = slicedTime * 3600000;
					break;
				case 'd':
					banTime = slicedTime * 86400000;
					break;
				case 'm':
					banTime = slicedTime * 2592000000;
					break;
				case 'y':
					banTime = slicedTime * 31104000000;
					break;
				default:
					return interaction.editReply({ content: 'The time format must be the amount followed by :\n - h for hours\n - d for days\n - m for months\n - y for years' });
				}
			}
			else {
				return interaction.editReply({ content: 'The time format must be the amount followed by :\n - h for hours\n - d for days\n - m for months\n - y for years' });
			}
		}
		else {
			banTime = 0;
		}
		endDateObject = new Date(Date.now() + banTime);
		try {
			if (banTime != 0) {
				await infraction.create({
					id: idMax + 1,
					userId: target.id,
					guildId: interaction.guildId,
					enforcerId: interaction.member.id,
					type: 'Ban',
					reason: reason,
					endDate: endDateObject,
					ended: false,
				});
				await target.ban({ reason: reason });
				return interaction.editReply({ content: `${target} was banned from the server until ${time(endDateObject)}` });
			}
			else {
				await infraction.create({
					id: idMax + 1,
					userId: target.id,
					guildId: interaction.guildId,
					enforcerId: interaction.member.id,
					type: 'Ban',
					reason: reason,
					endDate: null,
					ended: null,
				});
				await target.ban({ reason: reason });
				return interaction.editReply({ content: `${target} was banned from the server` });
			}
		}
		catch (error) {
			console.log(`An error occured while inserting into the database : ${error}`);
			return interaction.editReply({ content: 'There was an error while trying to create a new infraction' });
		}
	},
};