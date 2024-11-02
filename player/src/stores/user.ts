import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useUserStore = defineStore('user', () => {
  const username = ref('');
  const roomName = ref('');
  const userId = ref<number | null>(null);
  const roomId = ref<number | null>(null);

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
        return true;
      } catch (error) {
        console.error('Failed to parse user info from cookie:', error);
      }
    }
    return false;
  }

  async function login(newUsername: string, newRoomName: string) {
    try {
      // query user
      let userId: number | null = null;
      let roomId: number | null = null;
      
      try {
        const userResponse = await axios.get(`http://localhost:3000/api/user/query?username=${newUsername}`);
        userId = userResponse.data.id;
      } catch (error) {
        // not found, create user
        const createUserResponse = await axios.post('http://localhost:3000/api/user/create', {
          username: newUsername,
        });
        userId = createUserResponse.data.id;
      }

      try {
        const roomResponse = await axios.get(`http://localhost:3000/api/room/query?name=${newRoomName}`);
        roomId = roomResponse.data.id;
      } catch (error) {    // not found, create room
        const createRoomResponse = await axios.post('http://localhost:3000/api/room/create', {
          name: newRoomName,
        });
        roomId = createRoomResponse.data.id;
      }

      // join room
      const joinRoomResponse = await axios.post('http://localhost:3000/api/room/join', {
        userId,
        roomId,
      });
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }

    // set cookie
    document.cookie = `userInfo=${JSON.stringify({
      username: newUsername,
      roomName: newRoomName,
      userId,
      roomId,
    })}; path=/`;
  }

  return {
    username,
    roomName,
    userId,
    roomId,
    login,
    loadFromCookie,
  };
}); 