import { defineStore } from 'pinia';
import { ref } from 'vue';
import request, { updateAxiosBaseUrl } from '@/utils/axios';
import logger from '@/utils/logger';
import { syncManager } from '@/utils/sync/syncManager';
import { env } from '../config/env';
import { CookieManager, COOKIE_NAMES, type UrlConfigCookie, type UserInfoCookie } from '@/utils/cookies';
import { SessionManager, type Session } from '@/utils/storage';

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
  const authToken = ref<string | null>(null);

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

  // 获取 API base URL
  function getBaseUrl(): string {
    const urlConfig = CookieManager.getJSON<UrlConfigCookie>(COOKIE_NAMES.URL_CONFIG);
    if (urlConfig?.apiBaseUrl) {
      logger.info('Using API base URL from cookie:', urlConfig.apiBaseUrl);
      return urlConfig.apiBaseUrl;
    }
    return env.API_BASE_URL;
  }

  async function connectSyncManager() {
    const response = await request.get('sync/protocol');
    const baseURL = getBaseUrl();

    if (response.data.protocol === 'websocket') {
      const wsUrl = baseURL.replace('http', 'ws').replace('/api', '/ws');
      logger.info('Using WebSocket protocol, setting baseURL:', wsUrl);
      syncManager.setProtocol('websocket', wsUrl);
    }
    else if (response.data.protocol === 'sse') {
      const sseUrl = baseURL.replace('/api', '/sse');
      logger.info('Using SSE protocol, setting baseURL:', sseUrl);
      syncManager.setProtocol('sse', sseUrl);
    }
    syncManager.connect(userId.value, roomId.value);
    fetchOnlineUsers();
  }

  // 用户登录
  async function loginUser(newUsername: string): Promise<number> {
    const response = await request.post('user/login', { username: newUsername });
    return response.data.id;
  }

  // 创建或加入房间
  async function createOrJoinRoom(newUserId: number, newRoomName: string): Promise<{ roomId: number; token: string }> {
    const roomResponse = await request.post('room/create', { name: newRoomName });
    const newRoomId = roomResponse.data.id;

    const joinResponse = await request.post('room/join', {
      userId: newUserId,
      roomId: newRoomId,
    });

    return { roomId: newRoomId, token: joinResponse.data.token };
  }

  // 保存会话到存储
  function saveSession(newUserId: number, newUsername: string, newRoomId: number, newRoomName: string, token: string) {
    const session: Session = {
      user: { id: newUserId, username: newUsername },
      room: { id: newRoomId, name: newRoomName },
      token,
      timestamp: Date.now(),
    };
    SessionManager.save(session);

    // 同时保存到 Cookie，保持向后兼容
    CookieManager.setJSON<UserInfoCookie>(COOKIE_NAMES.USER_INFO, {
      userId: newUserId,
      roomId: newRoomId,
      username: newUsername,
      roomName: newRoomName,
    });
  }

  // 登录入口
  async function login(newUsername: string, newRoomName: string) {
    try {
      const newUserId = await loginUser(newUsername);
      const { roomId: newRoomId, token } = await createOrJoinRoom(newUserId, newRoomName);

      // 保存 token
      authToken.value = token;
      localStorage.setItem('authToken', token);

      // 保存会话
      saveSession(newUserId, newUsername, newRoomId, newRoomName, token);

      // 更新 Pinia 状态
      username.value = newUsername;
      roomName.value = newRoomName;
      userId.value = newUserId;
      roomId.value = newRoomId;

      connectSyncManager();
    } catch (error) {
      logger.error('登录失败:', error);
      throw error;
    }
  }

  // 从存储加载会话
  function loadFromSession(): boolean {
    // 优先从 SessionManager 加载
    const session = SessionManager.load();
    if (session) {
      authToken.value = session.token;
      username.value = session.user.username;
      roomName.value = session.room.name;
      userId.value = session.user.id;
      roomId.value = session.room.id;

      if (userId.value && roomId.value) {
        updateAxiosBaseUrl();
        connectSyncManager();
      }
      return true;
    }

    // 向后兼容：从 Cookie 加载
    return loadFromCookie();
  }

  // 向后兼容：从 Cookie 加载
  function loadFromCookie(): boolean {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      authToken.value = savedToken;
    }

    const userInfo = CookieManager.getJSON<UserInfoCookie>(COOKIE_NAMES.USER_INFO);
    if (userInfo) {
      username.value = userInfo.username;
      roomName.value = userInfo.roomName;
      userId.value = userInfo.userId;
      roomId.value = userInfo.roomId;

      if (userId.value && roomId.value) {
        updateAxiosBaseUrl();
        connectSyncManager();
      }
      return true;
    }
    return false;
  }

  // 登出
  function logout() {
    SessionManager.clear();
    CookieManager.clear();
    localStorage.removeItem('authToken');

    username.value = '';
    roomName.value = '';
    userId.value = null;
    roomId.value = null;
    authToken.value = null;
    userList.value = [];
  }

  return {
    username,
    roomName,
    userId,
    roomId,
    userList,
    authToken,
    login,
    loadFromSession,
    loadFromCookie,
    logout,
    connectSyncManager,
    updateUserList,
    fetchOnlineUsers,
  };
});