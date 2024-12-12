import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';

// load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// define environment variables interface
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DB_DIALECT: 'sqlite' | 'mysql' | 'postgres';
  DB_STORAGE: string;
  DB_LOGGING: boolean;
  LOG_LEVEL: string;
  
  // MySQL config
  MYSQL_HOST: string;
  MYSQL_PORT: number;
  MYSQL_DATABASE: string;
  MYSQL_USERNAME: string;
  MYSQL_PASSWORD: string;

  // PostgreSQL config
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_DATABASE: string;
  POSTGRES_USERNAME: string;
  POSTGRES_PASSWORD: string;

  DB_ENABLE_SSL: boolean;
  // WebSocket or SSE
  SYNC_PROTOCOL?: 'websocket' | 'sse';
}

// get environment variable, use system environment variable first
const getEnvValue = (key: string, defaultValue?: any): any => {
  return process.env[key] || defaultValue;
};

// environment variables configuration
export const env: EnvConfig = {
  NODE_ENV: getEnvValue('NODE_ENV', 'development'),
  PORT: parseInt(getEnvValue('PORT', '3000')),
  DB_DIALECT: getEnvValue('DB_DIALECT', 'sqlite') as 'sqlite' | 'mysql' | 'postgres',
  DB_STORAGE: getEnvValue('DB_STORAGE', './data/sync-player.sqlite'),
  DB_LOGGING: getEnvValue('DB_LOGGING', 'false') === 'true',
  LOG_LEVEL: getEnvValue('LOG_LEVEL', 'info'),

  // MySQL config
  MYSQL_HOST: getEnvValue('MYSQL_HOST', 'localhost'),
  MYSQL_PORT: parseInt(getEnvValue('MYSQL_PORT', '3306')),
  MYSQL_DATABASE: getEnvValue('MYSQL_DATABASE', 'sync_player'),
  MYSQL_USERNAME: getEnvValue('MYSQL_USERNAME', 'root'),
  MYSQL_PASSWORD: getEnvValue('MYSQL_PASSWORD', 'password'),

  // PostgreSQL config
  POSTGRES_HOST: getEnvValue('POSTGRES_HOST', 'localhost'),
  POSTGRES_PORT: parseInt(getEnvValue('POSTGRES_PORT', '5432')),
  POSTGRES_DATABASE: getEnvValue('POSTGRES_DATABASE', 'sync_player'),
  POSTGRES_USERNAME: getEnvValue('POSTGRES_USERNAME', 'postgres'),
  POSTGRES_PASSWORD: getEnvValue('POSTGRES_PASSWORD', 'password'),

  DB_ENABLE_SSL: getEnvValue('DB_ENABLE_SSL', 'false') === 'true',
  // WebSocket or SSE
  SYNC_PROTOCOL: getEnvValue('SYNC_PROTOCOL', 'websocket'),
};

// validate required environment variables
const validateEnv = () => {
  const requiredEnvs: Array<keyof EnvConfig> = [
    'NODE_ENV',
    'PORT',
    'DB_DIALECT',
  ];

  // 添加 MySQL 必需的环境变量验证
  if (env.DB_DIALECT === 'mysql') {
    requiredEnvs.push(
      'MYSQL_HOST',
      'MYSQL_PORT',
      'MYSQL_DATABASE',
      'MYSQL_USERNAME',
      'MYSQL_PASSWORD'
    );
  } else if (env.DB_DIALECT === 'postgres') {
    requiredEnvs.push(
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_DATABASE',
      'POSTGRES_USERNAME',
      'POSTGRES_PASSWORD'
    );
  } else if (env.DB_DIALECT === 'sqlite') {
    requiredEnvs.push('DB_STORAGE');
  } else {
    logger.error('Unsupported DB_DIALECT:', env.DB_DIALECT);
    process.exit(1);
  }

  const missingEnvs = requiredEnvs.filter(key => !env[key]);

  if (missingEnvs.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
    process.exit(1);
  }
};

validateEnv();

export default env; 