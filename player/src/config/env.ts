import logger from '@/utils/logger'

// 从环境变量或.env文件获取配置，优先使用系统环境变量
const getEnvValue = (key: string, defaultValue: string): string => {
  const value = import.meta.env[key] || defaultValue
  logger.debug(`Environment variable ${key}=${value}`)
  return value
}

export const env = {
  // API配置
  API_BASE_URL: getEnvValue('VITE_API_BASE_URL', 'http://localhost:3000'),
  WS_BASE_URL: getEnvValue('VITE_WS_BASE_URL', `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`),
  
  // 调试配置
  DEBUG: getEnvValue('VITE_DEBUG', 'false') === 'true',
  
  // 其他配置
  APP_TITLE: getEnvValue('VITE_APP_TITLE', 'Sync Player'),
  
  // 备案信息
  ICP_NUMBER: getEnvValue('VITE_ICP_NUMBER', ''),
  POLICE_NUMBER: getEnvValue('VITE_POLICE_NUMBER', ''),
} as const

export type Env = typeof env 