import { defineStore } from 'pinia';
import { ref } from 'vue';
import request, { updateAxiosBaseUrl } from '@/utils/axios';
import logger from '@/utils/logger';
import { syncManager } from '@/utils/sync/syncManager';
import { env } from '../config/env';

export interface UserListItem {
  id: number;
  username: string;
  online: boolean;
  isAdmin: boolean;
}

export const useUserStore = defineStore('user', () => {
  const username = ref('');
  const roomName = ref('');
  const userId = ref<number | null>(null);
  const roomId = ref<number | null>(null);
  const userList = ref<UserListItem[]>([]);

  function updateUserList(users: UserListItem[]) {
    userList.value = users;
  }

  async function fetchOnlineUsers() {
    try {
      const response = await request.get(`room/queryOnlineUsers?roomId=${roomId.value}`);
      updateUserList(response.data);
    } catch (error) {
      logger.error('获取在线用户列表失败:', error);
    }
  }

  async function connectSyncManager() {
    const response = await request.get('sync/protocol');

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

    if (response.data.protocol === 'websocket') {
      const wsUrl = baseURL.replace('http', 'ws').replace('api', 'socket');
      logger.info('Using WebSocket protocol, setting baseURL:', wsUrl);
      syncManager.setProtocol('websocket', wsUrl);
    }
    else if (response.data.protocol === 'sse') {
      const sseUrl = baseURL.replace('api', 'sse');
      logger.info('Using SSE protocol, setting baseURL:', sseUrl);
      syncManager.setProtocol('sse', sseUrl);
    }
    syncManager.connect(userId.value, roomId.value);
    fetchOnlineUsers();
  }

  async function login(newUsername: string, newRoomName: string) {
    let queryUserId: number | null = null;
    let queryRoomId: number | null = null;
    
    try {
      const queryUserResponse = await request.post('user/login', {
        username: newUsername,
      });
      queryUserId = queryUserResponse.data.id;

      const queryRoomResponse = await request.post('room/create', {
        name: newRoomName,
      });
      queryRoomId = queryRoomResponse.data.id;

      const joinRoomResponse = await request.post('room/join', {
        userId: queryUserId,
        roomId: queryRoomId,
      });

      username.value = newUsername;
      roomName.value = newRoomName;
      userId.value = queryUserId;
      roomId.value = queryRoomId;
      connectSyncManager();

    } catch (error) {
      logger.error('登录失败:', error);
      throw error;
    }

    document.cookie = `userInfo=${JSON.stringify({
      username: newUsername,
      roomName: newRoomName,
      userId: queryUserId,
      roomId: queryRoomId,
    })}; path=/`;
  }

  function loadFromCookie() {
    const userInfo = document.cookie
      .split('; ')
      .find(row => row.startsWith('userInfo='));
    
    if (userInfo) {
      try {
        const data = JSON.parse(decodeURIComponent(userInfo.split('=')[1]));
        username.value = data.username;
        roomName.value = data.roomName;
        userId.value = data.userId;
        roomId.value = data.roomId;
        if (userId.value && roomId.value) {
          updateAxiosBaseUrl();
          connectSyncManager();
        }
        return true;
      } catch (error) {
        logger.error('Failed to parse user info from cookie:', error);
      }
    }
    return false;
  }

  return {
    username,
    roomName,
    userId,
    roomId,
    userList,
    login,
    loadFromCookie,
    connectSyncManager: connectSyncManager,
    updateUserList,
    fetchOnlineUsers,
  };
}); 