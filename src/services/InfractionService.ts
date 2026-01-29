import { Op } from 'sequelize';
import { Infraction } from '../models/Infractions.js';
import { ModerationAction } from '../utils/discord/moderation.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';

export interface CreateInfractionData {
    userId: string;
    guildId: string;
    enforcerId: string;
    type: ModerationAction;
    reason?: string | null;
    endDate?: Date | null;
    ended?: boolean | null;
}

export class InfractionService {
	private logger: ShiveronLogger;

	public constructor(logger: ShiveronLogger) {
		this.logger = logger;
	}

	public async createInfraction(data: CreateInfractionData): Promise<Infraction> {
		try {
			const infraction = await Infraction.create(data);
			this.logger.debug(`Created ${data.type} infraction for user ${data.userId} in guild ${data.guildId}.`);
			return infraction;
		}
		catch (error) {
			this.logger.debug('Failed to create new infraction.');
			throw error;
		}
	}

	public async getInfractionById(id: number): Promise<Infraction | null> {
		return Infraction.findByPk(id);
	}

	public async getExpiredInfractions(): Promise<Infraction[]> {
		const now = new Date();
		return Infraction.findAll({
			where: {
				ended: false,
				endDate: { [Op.lte]: now },
			},
		});
	}

	public async getUserInfractions(userId: string, guildId: string): Promise<Infraction[]> {
		return Infraction.findAll({
			where: {
				userId: userId,
				guildId: guildId,
			},
		});
	}

	public async countUserInfractionsByType(userId: string, guildId: string, type: ModerationAction): Promise<number> {
		return Infraction.count({
			where: {
				userId: userId,
				guildId: guildId,
				type: type,
			},
		});
	}

	public async updateInfraction(id: number, updates: Partial<CreateInfractionData>): Promise<Infraction | null> {
		try {
			const [affectedCount] = await Infraction.update(updates, { where: { id } });
			if (affectedCount == 0) {
				return null;
			}
			return this.getInfractionById(id);
		}
		catch (error) {
			this.logger.error(`Failed to update infraction n°${id}.`);
			throw error;
		}
	}

	public async markAsEnded(id: number): Promise<Infraction | null> {
		return this.updateInfraction(id, { ended: true });
	}

	public async deleteInfraction(id: number): Promise<boolean> {
		const affectedCount = await Infraction.destroy({ where: { id } });
		return affectedCount > 0;
	}

	public async checkExpiredInfractions(client: ShiveronClient): Promise<void> {
		this.logger.info('Checking for expired infractions ...');

		const expiredInfractions = await this.getExpiredInfractions();

		let processedCount = 0;
		for (const infraction of expiredInfractions) {
			try {
				await this.processExpiredInfraction(client, infraction);
				processedCount++;
			}
			catch (error) {
				this.logger.error(`Error while processing expired infractions : ${error}`);
			}
		}

		if (processedCount > 0) {
			this.logger.info(`Finished processing ${processedCount} expired infractions.`);
		}
		else {
			this.logger.info('No expired infractions to process.');
		}
	}

	public async processExpiredInfraction(client: ShiveronClient, infraction: Infraction): Promise<void> {
		this.markAsEnded(infraction.id);

		if (infraction.type == ModerationAction.BAN) {
			const guild = await client.guilds.fetch(infraction.guildId);
			const result = await guild.bans.remove(infraction.userId);
			if (result) {
				this.logger.debug(`Removed ban for user ${infraction.userId} in guild ${infraction.guildId}.`);
			}
		}
		else {
			this.logger.debug(`Removed ${infraction.type} for user ${infraction.userId} in guild ${infraction.guildId}.`);
		}
	}
}