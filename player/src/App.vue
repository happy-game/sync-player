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
  <header>
    <div v-if="userStore.username" class="p-4 bg-gray-100">
      欢迎, {{ userStore.username }} | 房间: {{ userStore.roomName }}
    </div>
  </header>

  <main>
    <VideoPlayer />
    <AddPlaylist />
    <Playlist />
  </main>

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
