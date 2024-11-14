import { defineStore } from 'pinia';
import { ref } from 'vue';
import request, { updateAxiosBaseUrl } from '@/utils/axios';
import logger from '@/utils/logger';
// import { wsManager } from '@/utils/websocket';
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

  async function connectWebSocket() {
    // wsManager.connect(userId.value, roomId.value);
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
      logger.info('Using WebSocket protocol, setting baseURL:', baseURL.replace('http', 'ws').replace('api', 'socket'));
      syncManager.setProtocol('websocket', baseURL.replace('http', 'ws').replace('api', 'socket'));
    }
    else if (response.data.protocol === 'sse') {
      logger.info('Using SSE protocol, setting baseURL:', baseURL.replace('api', 'sse'));
      syncManager.setProtocol('sse', baseURL.replace('api', 'sse'));
    }
    syncManager.connect(userId.value, roomId.value);
    // 连接后立即获取在线用户列表
    fetchOnlineUsers();
  }

  async function login(newUsername: string, newRoomName: string) {
    let queryUserId: number | null = null;
    let queryRoomId: number | null = null;
    
    try {
      try {
        const userResponse = await request.get(`user/query?username=${newUsername}`);
        queryUserId = userResponse.data.id;
      } catch (error) {
        const createUserResponse = await request.post('user/create', {
          username: newUsername,
        });
        queryUserId = createUserResponse.data.id;
      }

      try {
        const roomResponse = await request.get(`room/query?name=${newRoomName}`);
        queryRoomId = roomResponse.data.id;
      } catch (error) {
        const createRoomResponse = await request.post('room/create', {
          name: newRoomName,
        });
        queryRoomId = createRoomResponse.data.id;
      }

      const joinRoomResponse = await request.post('room/join', {
        userId: queryUserId,
        roomId: queryRoomId,
      });

      username.value = newUsername;
      roomName.value = newRoomName;
      userId.value = queryUserId;
      roomId.value = queryRoomId;
      connectWebSocket();

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
        
        // initAxios();
        if (userId.value && roomId.value) {
          updateAxiosBaseUrl();
          connectWebSocket();
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
    connectWebSocket,
    updateUserList,
    fetchOnlineUsers,
  };
}); 