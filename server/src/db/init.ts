import sequelize from './connection';
import Room from '../models/Room';
import User from '../models/User';
import RoomMember from '../models/RoomMember';
import PlaylistItem from '../models/PlaylistItem';
import VideoSource from '../models/VideoSource';
import logger from '../config/logger';

// set model relations
Room.belongsToMany(User, { through: RoomMember });
User.belongsToMany(Room, { through: RoomMember });

// playlist association
Room.hasMany(PlaylistItem, { foreignKey: 'roomId' });
PlaylistItem.belongsTo(Room, { foreignKey: 'roomId' });

// video source association
PlaylistItem.hasMany(VideoSource, { foreignKey: 'playlistItemId' });
VideoSource.belongsTo(PlaylistItem, { foreignKey: 'playlistItemId' });

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('Success to connect database');
    
    // sync all models to database
    await sequelize.sync({ force: true }); // note: don't use force: true in production
    logger.info('Sync database models');
  } catch (error) {
    logger.error('Failed to init database:', error);
    throw error;
  }
} 