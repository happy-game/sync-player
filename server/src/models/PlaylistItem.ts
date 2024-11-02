import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';
import Room from './Room';

export enum PlayStatus {
  PENDING = 'pending',
  PLAYING = 'playing',
  PAUSED = 'paused',
  FINISHED = 'finished'
}

class PlaylistItem extends Model {
  declare id: number;
  declare roomId: number;
  declare title: string;
  declare orderIndex: number;
  declare playStatus: PlayStatus;
  declare createdTime: Date;
}

PlaylistItem.init({
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  playStatus: {
    type: DataTypes.ENUM(...Object.values(PlayStatus)),
    allowNull: false,
    defaultValue: PlayStatus.PENDING
  },
  createdTime: {
    type: DataTypes.DATE(3),
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'PlaylistItem',
  tableName: 'playlist_items',
  timestamps: false
});

export default PlaylistItem; 