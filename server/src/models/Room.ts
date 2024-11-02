import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';

class Room extends Model {
  declare id: number;
  declare name: string;
  declare passwordHash: string | null;
  declare createdTime: Date;
  declare lastActiveTime: Date;
}

Room.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  createdTime: {
    type: DataTypes.DATE(3),
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lastActiveTime: {
    type: DataTypes.DATE(3),
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Room',
  tableName: 'rooms',
  timestamps: false
});

export default Room; 