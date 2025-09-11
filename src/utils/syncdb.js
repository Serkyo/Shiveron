const sequelize = require('./database');
const guild = require('../models/guild');
const tempVoice = require('../models/tempVoice');
const infraction = require('../models/infraction');

function syncDB() {
	sequelize.sync({ force: true });
	guild.sync({ force: true });
	tempVoice.sync({ force: true });
	infraction.sync({ force: true });
}

module.exports = syncDB;