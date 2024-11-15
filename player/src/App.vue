<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VideoPlayer from './components/VideoPlayer.vue';
import LoginModal from './components/LoginModal.vue';
import Playlist from './components/Playlist.vue';
import AddPlaylist from './components/AddPlaylist.vue';
import Users from './components/Users.vue';
import Playing from './components/Playing.vue';
import { useUserStore } from './stores/user';
import logger from './utils/logger';
import IcpBeian from './components/IcpBeian.vue';
import PoliceBeian from './components/PoliceBeian.vue';
import { env } from './config/env';

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
    <!-- <header class="border-b">
      <div v-if="userStore.username" class="px-4 flex items-center justify-between h-14">
        <div class="text-sm text-muted-foreground">
          欢迎, {{ userStore.username }} | 房间: {{ userStore.roomName }}
        </div>
      </div>
    </header> -->

    <main class="h-[calc(100vh-3.5rem)]">
      <div class="flex flex-col md:grid md:grid-cols-4 h-full">
        <div class="flex-1 md:col-span-3 flex flex-col">
          <div class="flex-1">
            <VideoPlayer class="w-full h-full" />
          </div>
          <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <AddPlaylist />
            <Playing />
          </div>
        </div>
        
        <div class="h-[300px] md:h-full md:col-span-1 p-4 border-t md:border-t-0 md:border-l">
          <Playlist class="h-full overflow-y-auto" />
        </div>
      </div>
    </main>
    
    <!-- 备案信息 -->
    <footer v-if="env.ICP_NUMBER || env.POLICE_NUMBER" class="w-full py-4 flex justify-center items-center gap-4 border-t">
      <IcpBeian v-if="env.ICP_NUMBER" />
      <PoliceBeian v-if="env.POLICE_NUMBER" />
    </footer>
  </div>
  <Users />
  <LoginModal 
    :show="showLoginModal"
    @close="showLoginModal = false"
  />
</template>

<style scoped>
main {
  min-height: calc(100vh - 56px);
}
</style>
