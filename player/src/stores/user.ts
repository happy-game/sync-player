import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import logger from '@/utils/logger';

export const useUserStore = defineStore('user', () => {
  const username = ref('');
  const roomName = ref('');
  const userId = ref<number | null>(null);
  const roomId = ref<number | null>(null);
  const ws = ref<WebSocket | null>(null);

  function connectWebSocket() {
    if (ws.value) {
      ws.value.close();
    }

    ws.value = new WebSocket(`ws://${location.host}/socket`);
    
    ws.value.onopen = () => {
      if (ws.value && userId.value && roomId.value) {
        ws.value.send(JSON.stringify({
          type: 'auth',
          userId: userId.value.toString(),
          roomId: roomId.value.toString()
        }));
      }
    };

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'auth_success') {
        logger.info('WebSocket 认证成功');
      }
    };

    ws.value.onclose = () => {
      logger.info('WebSocket 连接已关闭');
      ws.value = null;
    };

    ws.value.onerror = (error) => {
      logger.error('WebSocket 错误:', error);
      ws.value = null;
    };
  }

  async function login(newUsername: string, newRoomName: string) {
    let queryUserId: number | null = null;
    let queryRoomId: number | null = null;
    
    try {
      try {
        const userResponse = await axios.get(`api/user/query?username=${newUsername}`);
        queryUserId = userResponse.data.id;
      } catch (error) {
        const createUserResponse = await axios.post('api/user/create', {
          username: newUsername,
        });
        queryUserId = createUserResponse.data.id;
      }

      try {
        const roomResponse = await axios.get(`api/room/query?name=${newRoomName}`);
        queryRoomId = roomResponse.data.id;
      } catch (error) {
        const createRoomResponse = await axios.post('api/room/create', {
          name: newRoomName,
        });
        queryRoomId = createRoomResponse.data.id;
      }

      const joinRoomResponse = await axios.post('api/room/join', {
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
        
        connectWebSocket();
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
    ws,
    login,
    loadFromCookie,
    connectWebSocket,
  };
}); 