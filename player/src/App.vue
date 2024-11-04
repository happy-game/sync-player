<script setup lang="ts">
import { ref, onMounted } from 'vue';
import VideoPlayer from './components/VideoPlayer.vue';
import LoginModal from './components/LoginModal.vue';
import { useUserStore } from './stores/user';
import Playlist from './components/Playlist.vue';

const showLoginModal = ref(true);
const userStore = useUserStore();

onMounted(() => {
  // try to load user from cookie
  if (userStore.loadFromCookie()) {
    showLoginModal.value = false;
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
