import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';
import Room from './Room';
import User from './User';

class RoomMember extends Model {
  declare id: number;
  declare roomId: number;
  declare userId: number;
  declare isAdmin: boolean;
  declare canGrantAdmin: boolean;
}

RoomMember.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  canGrantAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  sequelize,
  modelName: 'RoomMember',
  tableName: 'room_members',
  timestamps: false
});

export default RoomMember; 