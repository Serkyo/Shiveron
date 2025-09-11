const Sequelize = require('sequelize');
const sequelize = require('./../utils/database');

const infraction = sequelize.define('infraction', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
	},
	userId: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	guildId: {
		type: Sequelize.STRING,
		primaryKey: true,
	},
	enforcerId: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	type: {
		type: Sequelize.STRING,
		allowNull: false,
	},
	reason: {
		type: Sequelize.STRING,
		allowNull: true,
	},
	endDate: {
		type: Sequelize.DATE,
		allowNull: true,
	},
	ended: {
		type: Sequelize.BOOLEAN,
		allowNull: true,
	},
});

module.exports = infraction;