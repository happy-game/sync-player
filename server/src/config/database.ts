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
    : env.DB_DIALECT === 'mysql'
    ? {
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        database: env.MYSQL_DATABASE,
        username: env.MYSQL_USERNAME,
        password: env.MYSQL_PASSWORD,
        dialectOptions: env.DB_ENABLE_SSL
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false
              }
            }
          : {}
      }
    : env.DB_DIALECT === 'postgres'
    ? {
        host: env.POSTGRES_HOST,
        port: env.POSTGRES_PORT,
        database: env.POSTGRES_DATABASE,
        username: env.POSTGRES_USERNAME,
        password: env.POSTGRES_PASSWORD,
        dialectOptions: env.DB_ENABLE_SSL
          ? {
              ssl: {
                require: true,
                rejectUnauthorized: false
              }
            }
          : {}
      }
    : {})
};