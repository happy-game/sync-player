<template>
  <div v-if="userStore.username" class="playlist-container p-4">
    <h2 class="text-xl font-bold mb-4">播放列表</h2>
    <Button
      @click="clearPlaylist()"
      class="mb-4"
      v-if="playlistStore.playlist.length > 0"
      :disabled="loading"
    >
      清空播放列表
    </Button>
    <div v-if="loading" class="text-center py-4">
      加载中...
    </div>
    <div v-else-if="error" class="text-red-500 py-4">
      {{ error }}
    </div>
    <ul v-else class="space-y-2">
      <li
        v-for="(item, index) in playlistStore.playlist"
        :key="item.id"
        :class="[
          'p-3 rounded border',
          item.playStatus === 'playing' ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
        ]"
      >
        <div class="flex justify-between items-center gap-2">
          <span class="flex-1 font-medium">{{ item.title }}</span>
          <div class="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              @click="switchVideo(item.id)"
              :disabled="loading || item.playStatus === 'playing'"
            >
              播放
            </Button>
            <Button
              size="sm"
              variant="ghost"
              @click="moveVideo(item.id, 'top')"
              :disabled="loading || index === 0"
            >
              置顶
            </Button>
            <Button
              size="sm"
              variant="ghost"
              @click="moveVideo(item.id, 'up')"
              :disabled="loading || index === 0"
            >
              上移
            </Button>
            <Button
              size="sm"
              variant="ghost"
              @click="moveVideo(item.id, 'down')"
              :disabled="loading || index === playlistStore.playlist.length - 1"
            >
              下移
            </Button>
            <Button
              size="sm"
              variant="destructive"
              @click="deleteVideo(item.id)"
              :disabled="loading"
            >
              删除
            </Button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user'
import { usePlaylistStore } from '../stores/playlist'
import logger from '../utils/logger'
import { syncManager } from '@/utils/sync/syncManager'
import { Button } from './ui/button'

const userStore = useUserStore()
const playlistStore = usePlaylistStore()

const loading = ref(false)
const error = ref<string | null>(null)

const fetchPlaylist = async () => {
  if (!userStore.roomId) return

  try {
    loading.value = true
    error.value = null
    await playlistStore.fetchPlaylist(userStore.roomId)
  } catch (err) {
    logger.error('Fetch playlist error', err)
    error.value = '获取播放列表失败'
  } finally {
    loading.value = false
  }
}

async function moveVideo(videoId: number, direction: 'top' | 'up' | 'down') {
  if (!userStore.roomId) return

  const index = playlistStore.playlist.findIndex((item) => item.id === videoId)
  if (index === -1) return

  let targetIndex = index
  if (direction === 'top') {
    targetIndex = 0
  } else if (direction === 'up') {
    targetIndex = Math.max(0, index - 1)
  } else if (direction === 'down') {
    targetIndex = Math.min(playlistStore.playlist.length - 1, index + 1)
  }

  if (targetIndex === index) return

  const targetVideo = playlistStore.playlist[targetIndex]

  try {
    loading.value = true
    await playlistStore.swapVideos(userStore.roomId, videoId, targetVideo.id)
  } catch (err) {
    logger.error('Move video error', err)
    error.value = '移动视频失败'
  } finally {
    loading.value = false
  }
}

async function clearPlaylist() {
  if (!userStore.roomId) return

  try {
    loading.value = true
    await playlistStore.clearPlaylist(userStore.roomId)
  } catch (err) {
    logger.error('Clear playlist error', err)
    error.value = '清空播放列表失败'
  } finally {
    loading.value = false
  }
}

async function deleteVideo(videoId: number) {
  if (!userStore.roomId) return

  try {
    loading.value = true
    await playlistStore.deleteVideo(userStore.roomId, videoId)
  } catch (err) {
    logger.error('Delete video error', err)
    error.value = '删除视频失败'
  } finally {
    loading.value = false
  }
}

async function switchVideo(videoId: number) {
  if (!userStore.roomId) return

  try {
    loading.value = true
    await playlistStore.switchVideo(userStore.roomId, videoId)
  } catch (err) {
    logger.error('Switch video error', err)
    error.value = '切换视频失败'
  } finally {
    loading.value = false
  }
}

watch(() => userStore.username, (newValue) => {
  if (newValue) {
    fetchPlaylist()
  }
})

onMounted(() => {
  syncManager.subscribe('updatePlaylist', handleUpdatePlaylist)
  if (userStore.roomId) {
    fetchPlaylist()
  }
})

onUnmounted(() => {
  syncManager.unsubscribe('updatePlaylist', handleUpdatePlaylist)
})

function handleUpdatePlaylist() {
  logger.info('Received updatePlaylist message')
  fetchPlaylist()
}
</script>