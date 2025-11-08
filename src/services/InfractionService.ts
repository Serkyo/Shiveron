import { Op } from 'sequelize';
import { Infraction } from '../models/Infractions.js';
import { ModerationAction } from '../utils/ModerationUtils.js';
import { ShiveronClient } from '../core/ShiveronClient.js';

export interface CreateInfractionData {
    userId: string;
    guildId: string;
    enforcerId: string;
    type: ModerationAction;
    reason?: string;
    endDate?: Date;
    ended?: boolean;
}

export class InfractionService {
	public static async createInfraction(data: CreateInfractionData): Promise<Infraction> {
		try {
			const infraction = await Infraction.create(data);
			console.log(`Created ${data.type} infraction for user ${data.userId} in guild ${data.guildId}`);
			return infraction;
		}
		catch (error) {
			console.log('Failed to create infraction:', error);
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
		const [affectedCount] = await Infraction.update(updates, { where: { id } });
		if (affectedCount == 0) {
			return null;
		}
		return this.getInfractionById(id);
	}

	public static async markAsEnded(id: number): Promise<Infraction | null> {
		return this.updateInfraction(id, { ended: true });
	}

	public static async deleteInfraction(id: number): Promise<Boolean> {
		const affectedCount = await Infraction.destroy({ where: { id } });
		return affectedCount > 0;
	}

	public static async checkExpiredInfractions(client: ShiveronClient): Promise<void> {
		console.log('Checking for expired infractions ...');

		const expiredInfractions = await this.getExpiredInfractions();

		let processedCount = 0;
		for (const infraction of expiredInfractions) {
			try {
				await this.processExpiredInfraction(client, infraction);
				processedCount++;
			}
			catch (error) {
				console.log('Error : ', error);
			}
		}

		if (processedCount > 0) {
			console.log(`Finished processing ${processedCount} expired infractions`);
		}
		else {
			console.log('No expired infractions to process');
		}
	}

	public static async processExpiredInfraction(client: ShiveronClient, infraction: Infraction): Promise<void> {
		await this.markAsEnded(infraction.id);

		if (infraction.type == ModerationAction.BAN) {
			const guild = await client.guilds.fetch(infraction.guildId);
			const result = await guild.bans.remove(infraction.userId);
			if (result) {
				console.log(`Removed ban for user ${infraction.userId}`);
			}
		}
		else {
			console.log(`Removed ${infraction.type} for user ${infraction.userId}`);
		}
	}
}