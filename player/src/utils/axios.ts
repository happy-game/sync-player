import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { env } from '../config/env';
import logger from './logger';

// 创建axios实例
let request: AxiosInstance;

function initAxios() {
  // 从cookie中获取URL配置
  const urlConfig = document.cookie
    .split('; ')
    .find(row => row.startsWith('urlConfig='));
  
  let baseURL = env.API_BASE_URL;
  
  if (urlConfig) {
    try {
      const config = JSON.parse(decodeURIComponent(urlConfig.split('=')[1]));
      if (config.apiBaseUrl) {
        baseURL = config.apiBaseUrl;
        logger.info('Using API base URL from cookie:', baseURL);
      }
    } catch (error) {
      logger.error('Failed to parse URL config from cookie:', error);
    }
  }

  request = axios.create({
    baseURL,
    timeout: 1000 * 10,
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });

  // 请求拦截器
  request.interceptors.request.use(
    config => {
      logger.debug('Request:', config.method?.toUpperCase(), config.url);
      return config;
    },
    error => {
      logger.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  request.interceptors.response.use(
    response => {
      logger.debug('Response:', response.status, response.config.url);
      return response;
    },
    error => {
    //   logger.error('Response error:', error);
      return Promise.reject(error);
    }
  );

  return request;
}

function updateAxiosBaseUrl(apiBaseUrl?: string) {
  if (apiBaseUrl) {
    request.defaults.baseURL = apiBaseUrl;
  }
  else {
    // 从cookie中获取URL配置
    const urlConfig = document.cookie
      .split('; ')
      .find(row => row.startsWith('urlConfig='));
    if (urlConfig) {
      const config = JSON.parse(decodeURIComponent(urlConfig.split('=')[1]));
      if (config.apiBaseUrl) {
        request.defaults.baseURL = config.apiBaseUrl;
      }
    }
  }
}
// 初始化并导出实例
export default initAxios();

// 导出重新初始化方法,以便需要时重新创建实例
export { initAxios, updateAxiosBaseUrl }; 