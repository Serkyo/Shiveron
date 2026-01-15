import { DataTypes, Model, type Optional, Sequelize } from 'sequelize';

export interface TempVoiceAttributes {
    guildId: string;
    ownerId: string;
    channelId: string | null;
	channelControlMessageId: string | null;
    channelName: string;
    soundBoardEnabled: boolean;
    streamsEnabled: boolean;
    activitiesEnabled: boolean;
    privateChannel: boolean;
	messagesToKeep: number | null;
}

export interface TempVoiceCreationAttributes extends Optional<TempVoiceAttributes, 'channelId' | 'channelControlMessageId'> {}

export class TempVoice extends Model<TempVoiceAttributes, TempVoiceCreationAttributes> implements TempVoiceAttributes {
	declare guildId: string;
	declare ownerId: string;
	declare channelId: string | null;
	declare channelControlMessageId: string | null;
	declare channelName: string;
	declare soundBoardEnabled: boolean;
	declare streamsEnabled: boolean;
	declare activitiesEnabled: boolean;
	declare privateChannel: boolean;
	declare messagesToKeep: number | null;

	declare readonly createdAt: Date;
	declare readonly updatedAt: Date;

	public static initialize(sequelize: Sequelize): void {
		TempVoice.init(
			{
				guildId: {
					type: DataTypes.STRING,
					primaryKey: true,
					allowNull: false,
				},
				ownerId: {
					type: DataTypes.STRING,
					primaryKey: true,
					allowNull: false,
				},
				channelId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				channelControlMessageId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				channelName: {
					type: DataTypes.STRING(100),
					allowNull: false,
				},
				soundBoardEnabled: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
				streamsEnabled: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
				activitiesEnabled: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
				privateChannel: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
				messagesToKeep: {
					type: DataTypes.INTEGER,
					allowNull: true,
					defaultValue: 5
				}
			},
			{
				tableName: 'tempVoice',
				sequelize,
				timestamps: true,
				indexes: [
					{ fields: ['guildId'] },
					{ fields: ['ownerId'] },
				],
			},
		);
	}
}