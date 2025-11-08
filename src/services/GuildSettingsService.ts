import { GuildSettings } from "../models/GuildSettings.js";

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
				console.log(`Created settigns for guild ${guildId}`);
			}

			return [settings, created];
		}
		catch (error) {
			console.log(`Failed to create / get settings for guild ${guildId}`);
			throw error;
		}
	}

	public static async deleteGuildSettings(guildId: string): Promise<Boolean> {
		try {
			const amountDeleted = await GuildSettings.destroy({
				where: { guildId },
			});
			return amountDeleted > 0;
		}
		catch (error) {
			console.log(`Failed to delete guild settings for guild ${guildId}`);
			throw error;
		}
	}
}