<template>
  <div v-if="userStore.username" class="playlist-container p-4">
    <h2 class="text-xl font-bold mb-4">播放列表</h2>
    <!-- <button @click="clearPlaylist()" class="mb-4" v-if="playlistStore.playlist.length > 0">清空播放列表</button> -->
    <Button @click="clearPlaylist()" class="mb-4" v-if="playlistStore.playlist.length > 0">清空播放列表</Button>
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
        <div :class="['flex justify-between items-center', item.playStatus === 'playing' ? 'bg-green-100' : '']"> 
          <span>{{ item.title }}</span>
          <!-- Play Top Up Down Delete -->
          <button 
          @click="switchVideo(item.id)" 
          class="disabled:opacity-50"
          >
          播放
          </button>
          <button 
          @click="moveVideo(item.id, 'top')" 
          :disabled="playlistStore.playlist[0].id === item.id"
          class="disabled:opacity-50"
          >
          置顶
          </button>
          <button 
          @click="moveVideo(item.id, 'up')" 
          :disabled="playlistStore.playlist[0].id === item.id"
          class="disabled:opacity-50"
          >
          上移
          </button>
          <button
          @click="moveVideo(item.id, 'down')"
          :disabled="playlistStore.playlist[playlistStore.playlist.length - 1].id === item.id"
          class="disabled:opacity-50"
          >
          下移
          </button>
          <button @click="playlistStore.deleteVideo(item.id)">删除</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import request from '../utils/axios';
import { useUserStore } from '../stores/user';
import { usePlaylistStore } from '../stores/playlist';
import logger from '../utils/logger';
import { syncManager } from '@/utils/sync/syncManager';

import { Button } from './ui/button';

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
    const response = await request.get('/playlist/query', { params });
    await playlistStore.setPlaylist(response.data);
  } catch (err) {
    logger.error('Fetch playlist error', err);
    error.value = '获取播放列表失败';
  } finally {
    loading.value = false;
  }
};

function moveVideo(videoId: number, direction: 'top' | 'up' | 'down') {
  const index = playlistStore.playlist.findIndex((item) => item.id === videoId);
  if (index === -1) return;

  let targetIndex = index;
  if (direction === 'top') {
    targetIndex = 0;
  } else if (direction === 'up') {
    targetIndex = Math.max(0, index - 1);
  } else if (direction === 'down') {
    targetIndex = Math.min(playlistStore.playlist.length - 1, index + 1);
  }

  const targetVideo = playlistStore.playlist[targetIndex];
  playlistStore.swapVideos(videoId, targetVideo.id)
  .then(() => {
    logger.info('Move video success');
  })
}

function clearPlaylist() {
  if (!userStore.roomId) return;
  playlistStore.clearPlaylist(userStore.roomId);
}

function switchVideo(videoId: number) {
  playlistStore.switchVideo(videoId);
}

watch(() => userStore.username, (newValue) => {
  if (newValue) {
    fetchPlaylist();
  }
});

onMounted(() => {
  if (userStore.username) {
    fetchPlaylist();
  }
  syncManager.subscribe('updatePlaylist', handleUpdatePlaylist);
});

onUnmounted(() => {
  syncManager.unsubscribe('updatePlaylist', handleUpdatePlaylist);
});

function handleUpdatePlaylist() {
  logger.info('Received updatePlaylist message');
  fetchPlaylist();
}
</script>