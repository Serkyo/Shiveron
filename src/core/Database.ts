import { Sequelize } from 'sequelize';
import { ShiveronLogger } from './ShiveronLogger.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { Infraction } from '../models/Infractions.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { getConfig } from '../utils/config.js';

export class Database {
	private static instance: Database;
	private sequelize: Sequelize;

	private constructor() {
		this.sequelize = new Sequelize(
			getConfig('DB_NAME'),
			getConfig('DB_USER')!,
			getConfig('DB_PASS')!,
			{
				host: getConfig('DB_HOST')!,
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
		let connectionSuccessful = false;
		while (!connectionSuccessful) {
			try {
				await this.sequelize.authenticate();
				await this.sequelize.sync();
				connectionSuccessful = true;
				ShiveronLogger.info('Database connected and synced.');
			}
			catch (error) {
				ShiveronLogger.warn(`Database connection failed. Retrying in 5s ...`);
				await new Promise(res => setTimeout(res, 5000));
			}
		}
	}

	public getSequelize(): Sequelize {
		return this.sequelize;
	}
}
