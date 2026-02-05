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
	maxWarnings?: number | null;
	lang?: string;
}

export class GuildSettingsService {
	private logger: ShiveronLogger;

	public constructor(logger: ShiveronLogger) {
		this.logger = logger;
	}

	public async createOrGetGuildSettings(guildId: string): Promise<[GuildSettings, boolean]> {
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
					maxWarnings: null,
					lang: 'en',
				},
			});
			if (created) {
				this.logger.debug(`Created settings for guild ${guildId}.`);
			}

			return [settings, created];
		}
		catch (error) {
			this.logger.error(`Failed to create / get settings for guild ${guildId}.`);
			throw error;
		}
	}

	public async isDepartureOn(guildId: string): Promise<boolean> {
		const guild = await this.getGuildSettingsById(guildId);
		return guild?.joinChannelId != null || guild?.leaveChannelId != null;
	}

	public async isTempVoiceOn(guildId: string): Promise<boolean> {
		const guild = await this.getGuildSettingsById(guildId);
		return guild?.tempChannelId != null;
	}

	public async isMaxWarningsOn(guildId: string): Promise<boolean> {
		const guild = await this.getGuildSettingsById(guildId);
		return guild?.maxWarnings != null;
	}

	public async getGuildSettingsById(guildId: string): Promise<GuildSettings | null> {
		return GuildSettings.findOne({ where: { guildId } });
	}

	public async deleteGuildSettings(guildId: string): Promise<boolean> {
		const amountDeleted = await GuildSettings.destroy({
			where: { guildId },
		});
		return amountDeleted > 0;
	}

	public async updateGuildSettings(updates: CreateGuildSettingsData): Promise<GuildSettings | null> {
		try {
			const [affectedCount] = await GuildSettings.update(updates, { where: { guildId: updates.guildId } });
			if (affectedCount == 0) {
				return null;
			}
			const guildSettings = await this.getGuildSettingsById(updates.guildId);
			return guildSettings;
		}
		catch (error) {
			this.logger.error(`Failed to update guild settings for guild ${updates.guildId}.`);
			throw error;
		}
	}
}
