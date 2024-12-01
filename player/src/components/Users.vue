<template>
  <div v-if="userStore.username">
    <div v-show="isVisible" class="fixed bottom-4 right-4 z-50">
      <div class="bg-white rounded-lg shadow-lg p-4 w-80">
        <!-- 标题栏 -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="text-sm font-medium">房间: {{ userStore.roomName }}({{ userStore.roomId }}), 用户: {{ userStore.username }} ({{ userStore.userId }})</div>
            <!-- <div class="text-xs text-muted-foreground">({{ users.length }})</div> -->
          </div>
          <div class="flex items-center gap-1">
            <button 
              class="text-muted-foreground hover:text-foreground p-1 rounded"
              @click="displaySettings"
            >
              <Settings class="h-4 w-4" />
            </button>
            <button 
              class="text-muted-foreground hover:text-red-500 p-1 rounded"
              @click="handleLogout"
            >
              <LogOut class="h-4 w-4" />
            </button>
            <button 
              class="text-muted-foreground hover:text-red-500 p-1 rounded"
              @click="isVisible = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- 用户列表 -->
        <div class="space-y-2">
          <div v-for="user in userStore.userList" :key="user.id" class="flex items-center gap-2">
            <div class="relative">
              <div class="h-2 w-2 rounded-full" :class="user.online ? 'bg-green-500' : 'bg-gray-300'" >
              </div>
            </div>
            <div class="text-sm">{{ user.username }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重新显示按钮 -->
    <button 
      v-if="!isVisible && userStore.username"
      class="fixed bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 z-50"
      @click="isVisible = true"
    >
      <Users class="h-5 w-5" />
    </button>
  </div>
  <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Settings, X, Users, LogOut } from 'lucide-vue-next'
import { useUserStore } from '@/stores/user';
// import { wsManager } from '@/utils/websocket';
import { syncManager } from '@/utils/sync/syncManager';
import logger from '@/utils/logger';
import SettingsModal from './SettingsModal.vue';

const userStore = useUserStore();
// 控制显示状态
const isVisible = ref(true)
const showSettingsModal = ref(false);

const displaySettings = () => {
  showSettingsModal.value = true;
}

onMounted(() => {
  // wsManager.subscribe('updateUserList', handleUpdateUsers);
  syncManager.subscribe('updateUserList', handleUpdateUsers);
});

onUnmounted(() => {
  // wsManager.unsubscribe('updateUserList', handleUpdateUsers);
  syncManager.unsubscribe('updateUserList', handleUpdateUsers);
});

function handleUpdateUsers(data: any) {
  logger.info('收到用户列表更新:', data);
  userStore.fetchOnlineUsers();
}

function handleLogout() {
  // 清除所有cookies
  document.cookie.split(';').forEach(cookie => {
    document.cookie = cookie.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
  
  // 刷新页面
  window.location.reload();
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>