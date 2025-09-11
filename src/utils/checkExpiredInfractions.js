const infraction = require('./../models/infraction');

async function infractionVerification(row, comparedDate, client) {
	const infractionDate = row.get('endDate');
	const difference = infractionDate - comparedDate;
	if (difference <= 0) {
		const infractionId = row.get('id');
		const infractionGuildId = row.get('guildId');
		const infractionUserId = row.get('userId');
		const infractionType = row.get('type');
		if (infractionType == 'Ban') {
			const guild = await client.guilds.fetch(infractionGuildId);
			await guild.bans.remove(infractionUserId);
		}
		await infraction.update({ ended: true }, { where: { id: infractionId, guildId: infractionGuildId, userId: infractionUserId } });
		console.log(`Removed ${infractionType} for user ${infractionUserId} from guild ${infractionGuildId}`);
	}
}

async function checkExpiredInfractions(client) {
	console.log('Checking for expired infraction ...');
	const currentDate = new Date(Date.now());
	const ongoingInfractionList = await infraction.findAll({ where: { ended: false } });
	ongoingInfractionList.forEach((row) => infractionVerification(row, currentDate, client));
}

module.exports = checkExpiredInfractions;