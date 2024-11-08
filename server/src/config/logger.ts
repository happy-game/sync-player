import winston from 'winston';
import path from 'path';
import env from './env';

// define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// console format (with color but retains timestamp)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  transports: [
    // console output
    new winston.transports.Console({
      format: consoleFormat
    }),
    // error log file
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: logFormat
    }),
    // all log file
    new winston.transports.File({
      filename: path.join('logs', 'all.log'),
      format: logFormat
    }),
  ],
});

export default logger; 