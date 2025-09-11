const Sequelize = require('sequelize');
const sequelize = require('./../utils/database');

const Guild = sequelize.define('guild', {
	guildId: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	joinChannelId: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	joinMessage: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	leaveChannelId: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	leaveMessage: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	logsChannelId: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	tempChannelId: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	nbWarningsMax: {
		type: Sequelize.INTEGER,
		allowNull: true,
	},
});

module.exports = Guild;