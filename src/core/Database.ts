import { Sequelize } from 'sequelize';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { Infraction } from '../models/Infractions.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';

export class Database {
	private static instance: Database;
	private sequelize: Sequelize;

	private constructor() {
		this.sequelize = new Sequelize(
			process.env['DB_NAME']!,
			process.env['DB_USER']!,
			process.env['DB_PASS']!,
			{
				host: process.env['DB_HOST']!,
				dialect: 'postgres',
				logging: false,
			},
		);

		GuildSettings.initialize(this.sequelize);
		Infraction.initialize(this.sequelize);
		TempVoice.initialize(this.sequelize);
		VoiceACL.initialize(this.sequelize);
	}

	public static getInstance(): Database {
		if (!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}

	public async connect(): Promise<void> {
		try {
			await this.sequelize.authenticate();
			await this.sequelize.sync();
			ShiveronLogger.info('Database connected and synced.');
		}
		catch (error) {
			ShiveronLogger.error(`Database connection failed : ${error}`);
		}
	}

	public getSequelize(): Sequelize {
		return this.sequelize;
	}
}
