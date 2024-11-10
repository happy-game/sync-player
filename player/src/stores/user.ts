import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import logger from '@/utils/logger';
import { wsManager } from '@/utils/websocket';

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
      const response = await axios.get(`api/room/queryOnlineUsers?roomId=${roomId.value}`);
      updateUserList(response.data);
    } catch (error) {
      logger.error('获取在线用户列表失败:', error);
    }
  }

  function connectWebSocket() {
    wsManager.connect(userId.value, roomId.value);
    // 连接后立即获取在线用户列表
    fetchOnlineUsers();
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
    userList,
    login,
    loadFromCookie,
    connectWebSocket,
    updateUserList,
    fetchOnlineUsers,
  };
}); 