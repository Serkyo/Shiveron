import { GuildMember } from "discord.js";
import { TempVoice } from "../models/TempVoice.js";
import { VoiceACL } from "../models/VoiceACL.js";

export interface CreateTempVoiceData {
	channelId?: string;
	channelControlMessageId?: string;
	channelName?: string;
	soundBoardEnabled?: boolean;
	streamsEnabled?: boolean;
	activitiesEnabled?: boolean;
	privateChannel?: boolean;
}

export class VoiceService {
	public static async createOrGetTempVoice(guildId: string, owner: GuildMember): Promise<[TempVoice, VoiceACL[], boolean]> {
		try {
			const [tempVoice, createdTempVoice] = await TempVoice.findOrCreate({
				where: {
					guildId,
					ownerId: owner.id
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
					privateChannel: false
				}
			});
			
			const voiceACL = await this.getVoiceACLForTempVoice(guildId, owner.id)

			if (createdTempVoice) {
				console.log(`Created settings for temp voice for guild ${guildId} and user ${owner.id}`);
			}

			return [tempVoice, voiceACL, createdTempVoice];
		}
		catch (error) {
			console.log(`Failed to create / get temp voice for guild ${guildId} and user ${owner.id}`);
			throw error;
		}
	}

	public static async getTempVoiceByPK(guildId: string, ownerId: string): Promise<TempVoice | null> {
		return TempVoice.findOne({ where: { guildId, ownerId } });
	}

	public static async deleteTempVoice(guildId: string, ownerId: string): Promise<boolean> {
		const tempVoiceDeleted = await TempVoice.destroy({
			where: {
				guildId,
				ownerId
			}
		});

		await VoiceACL.destroy({
			where: {
				guildId,
				ownerId
			}
		});

		return tempVoiceDeleted > 0;
	}

	public static async updateTempVoice(guildId: string, ownerId: string, tempVoiceUpdates: Partial<CreateTempVoiceData>): Promise<TempVoice | null> {
		const [affectedCount] = await TempVoice.update(tempVoiceUpdates, { where: { guildId, ownerId } });
		if (affectedCount == 0) {
			return null;
		}
		const tempVoice = this.getTempVoiceByPK(guildId, ownerId)
		return tempVoice;
	}

	public static async getVoiceACLForTempVoice(guildId: string, ownerId: string) : Promise<VoiceACL[]> {
		return VoiceACL.findAll({
			where: { guildId, ownerId }
		})
	}

	public static async updateVoiceACL(guildId: string, ownerId: string, memberId: string, hasAccess: boolean) {
		const [success] = await VoiceACL.update(
			{ hasAccess: hasAccess },
			{ where: { guildId, ownerId, memberId }}
		);

		return success == 1;
	}
}