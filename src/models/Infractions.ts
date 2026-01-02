import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface InfractionAttributes {
    id: number;
    userId: string;
    guildId: string;
    enforcerId: string;
    type: string;
    reason: string | null;
    endDate: Date | null;
    ended: boolean | null;
}

export interface InfractionCreationAttributes extends Optional<InfractionAttributes, 'id' | 'reason' | 'endDate' | 'ended'> {}

export class Infraction extends Model<InfractionAttributes, InfractionCreationAttributes> implements InfractionAttributes {
	declare id: number;
	declare userId: string;
	declare guildId: string;
	declare enforcerId: string;
	declare type: string;
	declare reason: string | null;
	declare endDate: Date | null;
	declare ended: boolean | null;

	declare readonly createdAt: Date;
	declare readonly updatedAt: Date;

	public static initialize(sequelize: Sequelize): void {
		Infraction.init(
			{
				id: {
					type: DataTypes.INTEGER,
					primaryKey: true,
					autoIncrement: true,
				},
				userId: {
					type: DataTypes.STRING,
					primaryKey: true,
					allowNull: false,
				},
				guildId: {
					type: DataTypes.STRING,
					primaryKey: true,
					allowNull: false,
				},
				enforcerId: {
					type: DataTypes.STRING,
					allowNull: false,
				},
				type: {
					type: DataTypes.STRING,
					allowNull: false,
				},
				reason: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				endDate: {
					type: DataTypes.DATE,
					allowNull: true,
				},
				ended: {
					type: DataTypes.BOOLEAN,
					allowNull: true,
					defaultValue: false,
				},
			},
			{
				tableName: 'infraction',
				sequelize,
				timestamps: true,
				indexes: [
					{ fields: ['userId'] },
					{ fields: ['guildId'] },
					{ fields: ['type'] },
					{ fields: ['ended'] },
				],
			},
		);
	}
}