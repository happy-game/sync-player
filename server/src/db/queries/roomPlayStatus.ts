import RoomPlayStatus from '../../models/RoomPlayStatus';
import { Transaction } from 'sequelize';

export async function createRoomPlayStatus(
  roomId: number,
  paused: boolean = true,
  time: number = 0,
  timestamp: number = Date.now(),
  videoId: number = 0,
  transaction?: Transaction
) {
  return RoomPlayStatus.create({
    roomId,
    paused,
    time,
    timestamp,
    videoId
  }, { transaction });
}

export async function getRoomPlayStatus(roomId: number) {
  return RoomPlayStatus.findOne({
    where: { roomId }
  });
}

export async function updateRoomPlayStatus(
  roomId: number,
  data: {
    paused?: boolean;
    time?: number;
    timestamp?: number;
    videoId?: number;
  },
  transaction?: Transaction
) {
  const playStatus = await getRoomPlayStatus(roomId);
  if (!playStatus) {
    return createRoomPlayStatus(
      roomId,
      data.paused,
      data.time,
      data.timestamp,
      data.videoId,
      transaction
    );
  }

  return RoomPlayStatus.update(data, {
    where: { roomId },
    transaction
  });
}

export async function deleteRoomPlayStatus(roomId: number, transaction?: Transaction) {
  return RoomPlayStatus.destroy({
    where: { roomId },
    transaction
  });
}
