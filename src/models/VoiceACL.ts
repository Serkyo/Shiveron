import { DataTypes, Model, type Optional, Sequelize } from 'sequelize';

export interface VoiceACLAttributes {
    guildId: string;
    ownerId: string;
    memberId: string;
    hasAccess: boolean;
}

export interface VoiceACLCreationAttributes extends Optional<VoiceACLAttributes, never> {}

export class VoiceACL extends Model<VoiceACLAttributes, VoiceACLCreationAttributes> implements VoiceACLAttributes {
	declare guildId: string;
	declare ownerId: string;
	declare memberId: string;
	declare hasAccess: boolean;

	declare readonly createdAt: Date;
	declare readonly updatedAt: Date;

	public static initialize(sequelize: Sequelize): void {
		VoiceACL.init(
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
				memberId: {
					type: DataTypes.STRING,
					primaryKey: true,
					allowNull: false,
				},
				hasAccess: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: true,
				},
			},
			{
				tableName: 'voiceACL',
				sequelize,
				timestamps: true,
				indexes: [
					{ fields: ['guildId'] },
					{ fields: ['ownerId'] },
					{ fields: ['memberId'] },
				],
			},
		);
	}
}