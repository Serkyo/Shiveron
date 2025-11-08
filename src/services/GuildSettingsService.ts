import { GuildSettings } from "../models/GuildSettings.js";
import { ShiveronLogger } from "../utils/ShiveronLogger.js";

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
				ShiveronLogger.debug(`Created settigns for guild ${guildId}`);
			}

			return [settings, created];
		}
		catch (error) {
			ShiveronLogger.error(`Failed to create / get settings for guild ${guildId}`);
			throw error;
		}
	}

	public static async deleteGuildSettings(guildId: string): Promise<Boolean> {
		const amountDeleted = await GuildSettings.destroy({
			where: { guildId },
		});
		return amountDeleted > 0;
	}
}