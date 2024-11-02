import { Model, DataTypes } from 'sequelize';
import sequelize from '../db/connection';

class User extends Model {
  declare id: number;
  declare username: string;
  declare passwordHash: string | null;
  declare createdTime: Date;
  declare lastActiveTime: Date;
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  modelName: 'User',
  tableName: 'users',
  timestamps: false
});

export default User; 