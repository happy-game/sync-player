import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';
import Room from './Room';

class RoomPlayStatus extends Model {
    declare id: number;
    declare roomId: number;
    declare paused: boolean;    // true if the video is paused
    declare time: number;   // current time in seconds
    declare timestamp: number;  // timestamp of the last user action, in milliseconds
    declare videoId: number;    // the video id
}

RoomPlayStatus.init({
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
    paused: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    time: {
        type: DataTypes.DOUBLE,
        defaultValue: 0
    },
    timestamp: {
        type: DataTypes.BIGINT,
        defaultValue: 0
    },
    videoId: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'RoomPlayStatus',
    tableName: 'room_play_status',
    timestamps: false
});

export default RoomPlayStatus;