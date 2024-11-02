import Room from '../../models/Room';
import { Transaction } from 'sequelize';

export async function createRoom(name: string, password?: string, transaction?: Transaction) {
  // TODO if password is provided, hash it
  const passwordHash = password ? password : null;

  return Room.create({
    name,
    passwordHash,
    createdTime: new Date(),
    lastActiveTime: new Date()
  }, { transaction });
}

export async function getRoomById(id: number) {
  return Room.findByPk(id);
}

export async function getRoomByName(name: string) {
  return Room.findOne({ where: { name } });
}

export async function verifyRoomPassword(room: Room, password: string) {
  if (!room.passwordHash) {
    return true;
  }
  return password === room.passwordHash;
} 
