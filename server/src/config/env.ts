import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';

// load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// define environment variables interface
interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DB_DIALECT: 'sqlite' | 'mysql';
  DB_STORAGE: string;
  DB_LOGGING: boolean;
  LOG_LEVEL: string;
  
  // MySQL config
  MYSQL_HOST: string;
  MYSQL_PORT: number;
  MYSQL_DATABASE: string;
  MYSQL_USERNAME: string;
  MYSQL_PASSWORD: string;
}

// get environment variable, use system environment variable first
const getEnvValue = (key: string, defaultValue?: any): any => {
  return process.env[key] || defaultValue;
};

// environment variables configuration
export const env: EnvConfig = {
  NODE_ENV: getEnvValue('NODE_ENV', 'development'),
  PORT: parseInt(getEnvValue('PORT', '3000')),
  DB_DIALECT: getEnvValue('DB_DIALECT', 'sqlite') as 'sqlite' | 'mysql',
  DB_STORAGE: getEnvValue('DB_STORAGE', './sync-player.sqlite'),
  DB_LOGGING: getEnvValue('DB_LOGGING', 'false') === 'true',
  LOG_LEVEL: getEnvValue('LOG_LEVEL', 'info'),

  // MySQL config
  MYSQL_HOST: getEnvValue('MYSQL_HOST', 'localhost'),
  MYSQL_PORT: parseInt(getEnvValue('MYSQL_PORT', '3306')),
  MYSQL_DATABASE: getEnvValue('MYSQL_DATABASE', 'sync_player'),
  MYSQL_USERNAME: getEnvValue('MYSQL_USERNAME', 'root'),
  MYSQL_PASSWORD: getEnvValue('MYSQL_PASSWORD', 'password'),
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
  } else if (env.DB_DIALECT === 'sqlite') {
    requiredEnvs.push('DB_STORAGE');
  }

  const missingEnvs = requiredEnvs.filter(key => !env[key]);

  if (missingEnvs.length > 0) {
    logger.error(`Missing required environment variables: ${missingEnvs.join(', ')}`);
    process.exit(1);
  }
};

validateEnv();

export default env; 