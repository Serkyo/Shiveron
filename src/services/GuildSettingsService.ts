import { GuildSettings } from '../models/GuildSettings.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';

export interface CreateGuildSettingsData {
	guildId: string;
	joinChannelId?: string | null;
	joinMessage?: string | null;
	leaveChannelId?: string | null;
	leaveMessage?: string | null;
	logsChannelId?: string | null;
	tempChannelId?: string | null;
	nbWarningsMax?: number | null;
}

export class GuildSettingsService {
	public static async createOrGetGuildSettings(guildId: string): Promise<[GuildSettings, boolean]> {
		try {
			const [settings, created] = await GuildSettings.findOrCreate({
				where: { guildId },
				defaults: {
					guildId,
					joinChannelId: null,
					joinMessage: null,
					leaveChannelId: null,
					leaveMessage: null,
					logsChannelId: null,
					tempChannelId: null,
					nbWarningsMax: null,
				},
			});
			if (created) {
				ShiveronLogger.debug(`Created settigns for guild ${guildId}.`);
			}

			return [settings, created];
		}
		catch (error) {
			ShiveronLogger.error(`Failed to create / get settings for guild ${guildId}.`);
			throw error;
		}
	}

	public static async getGuildSettingsById(guildId: string): Promise<GuildSettings | null> {
		return GuildSettings.findOne({ where: { guildId } });
	}

	public static async deleteGuildSettings(guildId: string): Promise<boolean> {
		const amountDeleted = await GuildSettings.destroy({
			where: { guildId },
		});
		return amountDeleted > 0;
	}

	public static async updateGuildSettings(updates: CreateGuildSettingsData): Promise<GuildSettings | null> {
		try {
			const [affectedCount] = await GuildSettings.update(updates, { where: { guildId: updates.guildId } });
			if (affectedCount == 0) {
				return null;
			}
			const guildSettings = await this.getGuildSettingsById(updates.guildId);
			return guildSettings;
		}
		catch (error) {
			ShiveronLogger.error(`Failed to update guild settings for guild ${updates.guildId}.`);
			throw error;
		}
	}
}