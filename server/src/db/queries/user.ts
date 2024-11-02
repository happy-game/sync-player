import User from '../../models/User';
import { Transaction } from 'sequelize';

export async function createUser(username: string, password?: string, transaction?: Transaction) {
  // TODO: if password is provided, hash it
  const passwordHash = password ? password : null;

  return User.create({
    username,
    passwordHash,
    createdTime: new Date(),
    lastActiveTime: new Date()
  }, { transaction });
}

export async function getUserByUsername(username: string) {
  return User.findOne({ where: { username } });
}

export async function getUserById(id: number) {
  return User.findByPk(id);
} 