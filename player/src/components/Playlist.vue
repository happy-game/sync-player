<template>
  <div v-if="userStore.username" class="playlist-container p-4">
    <h2 class="text-xl font-bold mb-4">播放列表</h2>
    <div v-if="loading" class="text-center">
      加载中...
    </div>
    <div v-else-if="error" class="text-red-500">
      {{ error }}
    </div>
    <ul v-else class="space-y-2">
      <li 
        v-for="item in playlistStore.playlist" 
        :key="item.id"
        class="p-2 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
      >
        <div class="flex justify-between items-center">
          <span>{{ item.title }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useUserStore } from '../stores/user';
import { usePlaylistStore } from '../stores/playlist';
import logger from '../utils/logger';

const userStore = useUserStore();
const playlistStore = usePlaylistStore();

const loading = ref(true);
const error = ref<string | null>(null);

const fetchPlaylist = async () => {
  logger.info('fetch playlist');
  if (!userStore.username) return;
  
  try {
    loading.value = true;
    const params = {
      roomId: userStore.roomId
    };
    const response = await axios.get('http://localhost:3000/api/playlist/query', { params });
    playlistStore.setPlaylist(response.data);
  } catch (err) {
    error.value = '获取播放列表失败';
  } finally {
    loading.value = false;
  }
};


watch(() => userStore.username, (newValue) => {
  if (newValue) {
    fetchPlaylist();
  }
});

onMounted(() => {
  if (userStore.username) {
    fetchPlaylist();
  }
});
</script>