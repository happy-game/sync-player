import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';
import PlaylistItem from './PlaylistItem';

class VideoSource extends Model {
  declare id: number;
  declare playlistItemId: number;
  declare url: string;
  declare label: string;
  declare createdTime: Date;
  declare lastActiveTime: Date;
}

VideoSource.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  playlistItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: PlaylistItem,
      key: 'id'
    }
  },
  url: {
    type: DataTypes.STRING(255),
    allowNull: false
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
  modelName: 'VideoSource',
  tableName: 'video_sources',
  timestamps: false
});

export default VideoSource; 