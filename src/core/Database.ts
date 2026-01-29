import { Sequelize } from 'sequelize';
import { ShiveronLogger } from './ShiveronLogger.js';
import { GuildSettings } from '../models/GuildSettings.js';
import { Infraction } from '../models/Infractions.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { getConfig } from '../utils/config.js';

export class Database {
	private sequelize: Sequelize;
	private logger: ShiveronLogger;

	public constructor(logger: ShiveronLogger) {
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

		this.logger = logger;

		GuildSettings.initialize(this.sequelize);
		this.logger.info('Initialised GuildSettings model.');
		Infraction.initialize(this.sequelize);
		this.logger.info('Initialised Infraction model.');
		TempVoice.initialize(this.sequelize);
		this.logger.info('Initialised TempVoice model.');
		VoiceACL.initialize(this.sequelize);
		this.logger.info('Initialised VoiceACL model.');
	}

	public async connect(): Promise<void> {
		let connectionSuccessful = false;
		while (!connectionSuccessful) {
			try {
				await this.sequelize.authenticate();
				await this.sequelize.sync({ alter: true });
				connectionSuccessful = true;
				this.logger.info('Database connected and synced.');
			}
			catch (error) {
				this.logger.warn(`Database connection failed. Retrying in 5s ... \n${error}`);
				await new Promise(res => setTimeout(res, 5000));
			}
		}
	}

	public getSequelize(): Sequelize {
		return this.sequelize;
	}
}
