import { GuildMember } from 'discord.js';
import { TempVoice } from '../models/TempVoice.js';
import { VoiceACL } from '../models/VoiceACL.js';
import { ShiveronLogger } from '../core/ShiveronLogger.js';

export interface CreateTempVoiceData {
	guildId: string;
    ownerId: string;
	channelId?: string | null;
	channelControlMessageId?: string | null;
	channelName?: string;
	soundBoardEnabled?: boolean;
	streamsEnabled?: boolean;
	activitiesEnabled?: boolean;
	privateChannel?: boolean;
	messagesToKeep?: number | null;
	successorIds?: string[];
}

export class VoiceService {
	public static async createOrGetTempVoice(guildId: string, owner: GuildMember): Promise<[TempVoice, VoiceACL[], boolean]> {
		try {
			const [tempVoice, createdTempVoice] = await TempVoice.findOrCreate({
				where: {
					guildId,
					ownerId: owner.id,
				},
				defaults: {
					guildId,
					ownerId: owner.id,
					channelId: null,
					channelControlMessageId: null,
					channelName: owner.displayName,
					soundBoardEnabled: true,
					streamsEnabled: true,
					activitiesEnabled: true,
					privateChannel: false,
					messagesToKeep: 5,
					successorIds: [],
				},
			});

			const voiceACL = await this.getVoiceACLForTempVoice(guildId, owner.id);

			if (createdTempVoice) {
				ShiveronLogger.debug(`Created settings for temp voice for guild ${guildId} and user ${owner.id}.`);
			}

			return [tempVoice, voiceACL, createdTempVoice];
		}
		catch (error) {
			ShiveronLogger.error(`Failed to create / get temp voice for guild ${guildId} and user ${owner.id}.`);
			throw error;
		}
	}

	public static async findTempVoiceInGuild(guildId: string, channelId: string): Promise<TempVoice | null> {
		return TempVoice.findOne({ where: { guildId, channelId } });
	}

	public static async getTempVoiceByPK(guildId: string, ownerId: string): Promise<TempVoice | null> {
		return TempVoice.findOne({ where: { guildId, ownerId } });
	}

	public static async getTempVoiceByChannelId(channelId: string): Promise<TempVoice | null> {
		return TempVoice.findOne({ where: { channelId } });
	}

	public static async deleteTempVoice(guildId: string, ownerId: string): Promise<boolean> {
		const tempVoiceDeleted = await TempVoice.destroy({
			where: {
				guildId,
				ownerId,
			},
		});

		await VoiceACL.destroy({
			where: {
				guildId,
				ownerId,
			},
		});

		return tempVoiceDeleted > 0;
	}

	public static async updateTempVoice(updates: CreateTempVoiceData): Promise<TempVoice | null> {
		try {
			const [affectedCount] = await TempVoice.update(updates, { where: { guildId: updates.guildId, ownerId: updates.ownerId } });
			if (affectedCount == 0) {
				return null;
			}
			const tempVoice = await this.getTempVoiceByPK(updates.guildId, updates.ownerId);
			return tempVoice;
		}
		catch (error) {
			ShiveronLogger.error(`Failed to update temp voice with guild id ${updates.guildId} and owner id ${updates.ownerId}.`);
			throw error;
		}
	}

	public static async createOrUpdateVoiceACL(guildId: string, ownerId: string, memberId: string, hasAccess: boolean): Promise<VoiceACL | null> {
		try {
			const [voiceACL, created] = await VoiceACL.findOrCreate({
				where: { guildId, ownerId, memberId },
				defaults: { guildId, ownerId, memberId, hasAccess },
			});

			if (!created) {
				return this.updateVoiceACL(guildId, ownerId, memberId, hasAccess);
			}
			return voiceACL;
		}
		catch (error) {
			ShiveronLogger.error('Failed to create new VoiceACL');
			throw error;
		}
	}

	public static async getVoiceACLForTempVoice(guildId: string, ownerId: string) : Promise<VoiceACL[]> {
		return VoiceACL.findAll({
			where: { guildId, ownerId },
		});
	}

	public static async getVoiceACL(guildId: string, ownerId: string, memberId: string): Promise<VoiceACL | null> {
		return VoiceACL.findOne({ where: { guildId, ownerId, memberId } });
	}

	public static async updateVoiceACL(guildId: string, ownerId: string, memberId: string, hasAccess: boolean): Promise<VoiceACL | null> {
		try {
			const [affectedCount] = await VoiceACL.update(
				{ hasAccess },
				{ where: { guildId, ownerId, memberId } },
			);

			if (affectedCount == 0) {
				return null;
			}
			return this.getVoiceACL(guildId, ownerId, memberId);
		}
		catch (error) {
			ShiveronLogger.error(`Failed to update voice access list with guild id ${guildId}, owner id ${ownerId} and member id ${memberId}.`);
			throw error;
		}
	}

	public static async deleteVoiceACL(guildId: string, ownerId: string, memberId: string): Promise<boolean> {
		const affectedCount = await VoiceACL.destroy({ where: { guildId, ownerId, memberId } });
		return affectedCount > 0;
	}
}