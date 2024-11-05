<template>
  <div>
    <h1 class="text-2xl font-bold">添加视频</h1>
    <div class="mt-4">
      <!-- title, url -->
      <input type="text" v-model="title" class="w-full p-2 border border-gray-300 rounded" placeholder="标题" />
      <input type="text" v-model="url" class="w-full p-2 border border-gray-300 rounded mt-2" placeholder="URL" />
      <button class="w-full p-2 bg-blue-500 text-white rounded mt-2" @click="addVideo">添加</button>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { usePlaylistStore } from '@/stores/playlist';
import logger from '@/utils/logger';

const userStore = useUserStore();
const playlistStore = usePlaylistStore();

const title = ref('');
const url = ref('');

function addVideo() {
    logger.info('Add video');
    if (!title.value || !url.value) {
        logger.error('Title or url is empty');
        return;
    }
    if (!userStore.roomId) {
        logger.error('RoomId is empty');
        return;
    }
    playlistStore.addVideo(userStore.roomId, title.value, url.value);
}
onMounted(() => {
    logger.info('AddPlaylist mounted');
});
</script>