import { DataTypes, Model, type Optional, Sequelize } from 'sequelize';

export interface GuildSettingsAttributes {
	guildId: string;
	joinChannelId: string | null;
	joinMessage: string | null;
	leaveChannelId: string | null;
	leaveMessage: string | null;
	logsChannelId: string | null;
	tempChannelId: string | null;
	maxWarnings: number | null;
	lang: string;
}

export interface GuildSettingsCreationAttributes extends Optional<GuildSettingsAttributes, 'joinChannelId' | 'joinMessage' | 'leaveChannelId' | 'leaveMessage' | 'logsChannelId' | 'tempChannelId' | 'maxWarnings' | 'lang'> {}

export class GuildSettings extends Model<GuildSettingsAttributes, GuildSettingsCreationAttributes> implements GuildSettingsAttributes {
	declare guildId: string;
	declare joinChannelId: string | null;
	declare joinMessage: string | null;
	declare leaveChannelId: string | null;
	declare leaveMessage: string | null;
	declare logsChannelId: string | null;
	declare tempChannelId: string | null;
	declare maxWarnings: number | null;
	declare lang: string;

	declare readonly createdAt: Date;
	declare readonly updatedAt: Date;

	public static initialize(sequelize: Sequelize): void {
		GuildSettings.init(
			{
				guildId: {
					type: DataTypes.STRING,
					primaryKey: true,
				},
				joinChannelId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				joinMessage: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				leaveChannelId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				leaveMessage: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				logsChannelId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				tempChannelId: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				maxWarnings: {
					type: DataTypes.INTEGER,
					allowNull: true,
				},
				lang: {
					type: DataTypes.STRING,
					allowNull: false,
					defaultValue: 'en',
				},
			},
			{
				tableName: 'guildSettings',
				sequelize,
				timestamps: true,
				indexes: [
					{ fields: ['guildId'] },
				],
			},
		);
	}
}