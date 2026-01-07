import { Op } from 'sequelize';
import { Infraction } from '../models/Infractions.js';
import { ModerationAction } from '../utils/discord/ModerationUtils.js';
import { ShiveronClient } from '../core/ShiveronClient.js';
import { ShiveronLogger } from '../utils/ShiveronLogger.js';

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
	public static async createInfraction(data: CreateInfractionData): Promise<Infraction> {
		try {
			const infraction = await Infraction.create(data);
			ShiveronLogger.debug(`Created ${data.type} infraction for user ${data.userId} in guild ${data.guildId}.`);
			return infraction;
		}
		catch (error) {
			ShiveronLogger.debug('Failed to create new infraction.');
			throw error;
		}
	}

	public static async getInfractionById(id: number): Promise<Infraction | null> {
		return Infraction.findByPk(id);
	}

	public static async getExpiredInfractions(): Promise<Infraction[]> {
		const now = new Date();
		return Infraction.findAll({
			where: {
				ended: false,
				endDate: { [Op.lte]: now },
			},
		});
	}

	public static async getUserInfractions(userId: string, guildId: string): Promise<Infraction[]> {
		return Infraction.findAll({
			where: {
				userId: userId,
				guildId: guildId,
			},
		});
	}

	public static async countUserInfractionsByType(userId: string, guildId: string, type: ModerationAction): Promise<number> {
		return Infraction.count({
			where: {
				userId: userId,
				guildId: guildId,
				type: type,
			},
		});
	}

	public static async updateInfraction(id: number, updates: Partial<CreateInfractionData>): Promise<Infraction | null> {
		try {
			const [affectedCount] = await Infraction.update(updates, { where: { id } });
			if (affectedCount == 0) {
				return null;
			}
			return this.getInfractionById(id);
		}
		catch (error) {
			ShiveronLogger.error(`Failed to update infraction n°${id}.`);
			throw error;
		}
	}

	public static async markAsEnded(id: number): Promise<Infraction | null> {
		return this.updateInfraction(id, { ended: true });
	}

	public static async deleteInfraction(id: number): Promise<boolean> {
		const affectedCount = await Infraction.destroy({ where: { id } });
		return affectedCount > 0;
	}

	public static async checkExpiredInfractions(client: ShiveronClient): Promise<void> {
		ShiveronLogger.info('Checking for expired infractions ...');

		const expiredInfractions = await this.getExpiredInfractions();

		let processedCount = 0;
		for (const infraction of expiredInfractions) {
			try {
				await this.processExpiredInfraction(client, infraction);
				processedCount++;
			}
			catch (error) {
				ShiveronLogger.error(`Error while processing expired infractions : ${error}`);
			}
		}

		if (processedCount > 0) {
			ShiveronLogger.info(`Finished processing ${processedCount} expired infractions.`);
		}
		else {
			ShiveronLogger.info('No expired infractions to process.');
		}
	}

	public static async processExpiredInfraction(client: ShiveronClient, infraction: Infraction): Promise<void> {
		await this.markAsEnded(infraction.id);

		if (infraction.type == ModerationAction.BAN) {
			const guild = await client.guilds.fetch(infraction.guildId);
			const result = await guild.bans.remove(infraction.userId);
			if (result) {
				ShiveronLogger.debug(`Removed ban for user ${infraction.userId} in guild ${infraction.guildId}.`);
			}
		}
		else {
			ShiveronLogger.debug(`Removed ${infraction.type} for user ${infraction.userId} in guild ${infraction.guildId}.`);
		}
	}
}