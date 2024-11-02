import RoomMember from '../../models/RoomMember';
import { Transaction } from 'sequelize';

export async function addMemberToRoom(
  roomId: number, 
  userId: number, 
  isAdmin: boolean = false,
  canGrantAdmin: boolean = false,
  transaction?: Transaction
) {
  return RoomMember.create({
    roomId,
    userId,
    isAdmin,
    canGrantAdmin
  }, { transaction });
}

export async function removeMemberFromRoom(roomId: number, userId: number, transaction?: Transaction) {
  return RoomMember.destroy({
    where: {
      roomId,
      userId
    },
    transaction
  });
}

export async function getRoomMember(roomId: number, userId: number) {
  return RoomMember.findOne({
    where: {
      roomId,
      userId
    }
  });
} 