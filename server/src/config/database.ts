import { Dialect } from 'sequelize';

export const dbConfig = {
  dialect: 'sqlite' as Dialect,
  storage: './sync-player.sqlite',
  logging: false,
  define: {
    timestamps: true,
    underscored: true
  }
};