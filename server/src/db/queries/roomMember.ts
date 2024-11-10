import RoomMember from '../../models/RoomMember';
import User from '../../models/User';
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

export async function setMemberOnline(roomId: number, userId: number, online: boolean) {
  return RoomMember.update({ online }, {
    where: {
      roomId,
      userId
    }
  });
}

export async function getOnlineUsers(roomId: number) {
  // join RoomMember with User and select only online users
  // return RoomMember and username， map to UserListItem
  const members = await RoomMember.findAll({
    where: {
      roomId,
      online: true
    },
    include: [{
      model: User,
      attributes: ['username']
    }]
  });
  return members.map((member) => ({
    id: member.userId,
    username: member.User?.username,
    online: member.online,
    isAdmin: member.isAdmin,
  }));
}