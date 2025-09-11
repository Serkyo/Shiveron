const Sequelize = require('sequelize');
const sequelize = require('./../utils/database');

const tempVoice = sequelize.define('tempVoice', {
	guildId: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	ownerId: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	channelId: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	channelName: {
		type: Sequelize.STRING(100),
		allowNull: false,
	},
});

module.exports = tempVoice;