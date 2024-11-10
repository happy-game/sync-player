<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VideoPlayer from './components/VideoPlayer.vue';
import LoginModal from './components/LoginModal.vue';
import Playlist from './components/Playlist.vue';
import AddPlaylist from './components/AddPlaylist.vue';
import { useUserStore } from './stores/user';
import logger from './utils/logger';

const showLoginModal = ref(true);
const userStore = useUserStore();

onMounted(() => {
  // try to load user from cookie
  logger.info('正在尝试从cookie加载用户信息...');
  if (userStore.loadFromCookie()) {
    logger.info('成功从cookie加载用户信息:', userStore.username);
    showLoginModal.value = false;
  } else {
    logger.debug('未找到cookie中的用户信息');
  }
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b">
      <div v-if="userStore.username" class="px-4 flex items-center justify-between h-14">
        <div class="text-sm text-muted-foreground">
          欢迎, {{ userStore.username }} | 房间: {{ userStore.roomName }}
        </div>
      </div>
    </header>

    <main class="h-[calc(100vh-3.5rem)]">
      <div class="flex flex-col md:grid md:grid-cols-4 h-full">
        <div class="flex-1 md:col-span-3 flex flex-col">
          <div class="flex-1">
            <VideoPlayer class="w-full h-full" />
          </div>
          <div class="p-4">
            <AddPlaylist />
          </div>
        </div>
        
        <div class="h-[300px] md:h-full md:col-span-1 p-4 border-t md:border-t-0 md:border-l">
          <Playlist class="h-full overflow-y-auto" />
        </div>
      </div>
    </main>
  </div>

  <LoginModal 
    :show="showLoginModal"
    @close="showLoginModal = false"
  />
</template>

<style scoped>
main {
  min-height: calc(100vh - 60px);
}
</style>
