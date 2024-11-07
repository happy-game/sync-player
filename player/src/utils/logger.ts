import { ref } from 'vue';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

const currentLogLevel = ref(LogLevel.INFO);
const LOG_LEVEL_COLORS = {
  [LogLevel.ERROR]: 'color: #ff0000',
  [LogLevel.WARN]: 'color: #ffa500',
  [LogLevel.INFO]: 'color: #0000ff',
  [LogLevel.DEBUG]: 'color: #808080'
};

const LOG_LEVEL_LABELS = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG'
};

const VITE_DEBUG = import.meta.env.VITE_DEBUG === 'true';
if (VITE_DEBUG) {
  currentLogLevel.value = LogLevel.DEBUG;
  log(LogLevel.DEBUG, 'Debug mode enabled');
}

function formatTime() {
  return new Date().toISOString().slice(0, 23).replace('T', ' ');
}

function log(level: LogLevel, message: string, ...args: any[]) {
  if (level > currentLogLevel.value) return;

  const timestamp = formatTime();
  const levelLabel = LOG_LEVEL_LABELS[level];
  
  console.log(
    `%c[${timestamp}] ${levelLabel}: ${message}`,
    LOG_LEVEL_COLORS[level],
    ...args
  );
}

const logger = {
  setLevel(level: LogLevel) {
    currentLogLevel.value = level;
  },
  
  error(message: string, ...args: any[]) {
    log(LogLevel.ERROR, message, ...args);
  },
  
  warn(message: string, ...args: any[]) {
    log(LogLevel.WARN, message, ...args);
  },
  
  info(message: string, ...args: any[]) {
    log(LogLevel.INFO, message, ...args);
  },
  
  debug(message: string, ...args: any[]) {
    log(LogLevel.DEBUG, message, ...args);
  }
};

export default logger; 