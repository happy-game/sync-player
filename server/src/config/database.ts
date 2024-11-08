import { Dialect, Options } from 'sequelize';
import env from './env';

export const dbConfig: Options = {
  dialect: env.DB_DIALECT as Dialect,
  logging: env.DB_LOGGING,
  define: {
    timestamps: true,
    underscored: true
  },
  
  ...(env.DB_DIALECT === 'sqlite' 
    ? {
        storage: env.DB_STORAGE
      }
    : {
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        database: env.MYSQL_DATABASE,
        username: env.MYSQL_USERNAME,
        password: env.MYSQL_PASSWORD
      }
  )
};