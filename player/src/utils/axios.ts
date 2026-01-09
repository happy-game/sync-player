import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { env } from '../config/env';
import logger from './logger';
import { CookieManager, COOKIE_NAMES, type UrlConfigCookie } from './cookies';

// 创建axios实例
let request: AxiosInstance;

function initAxios() {
  let baseURL = env.API_BASE_URL;

  const urlConfig = CookieManager.getJSON<UrlConfigCookie>(COOKIE_NAMES.URL_CONFIG);
  if (urlConfig?.apiBaseUrl) {
    baseURL = urlConfig.apiBaseUrl;
    logger.info('Using API base URL from cookie:', baseURL);
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
      // Add JWT token to Authorization header if available
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

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
  } else {
    const urlConfig = CookieManager.getJSON<UrlConfigCookie>(COOKIE_NAMES.URL_CONFIG);
    if (urlConfig?.apiBaseUrl) {
      request.defaults.baseURL = urlConfig.apiBaseUrl;
    }
  }
}
// 初始化并导出实例
export default initAxios();

// 导出重新初始化方法,以便需要时重新创建实例
export { initAxios, updateAxiosBaseUrl }; 