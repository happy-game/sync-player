import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

export const usePlayerStore = defineStore('player', () => {
  const currentSource = ref('')

  function updateSource(source: string) {
    logger.info('更新视频源:', source)
    currentSource.value = source
  }

  return {
    currentSource,
    updateSource
  }
}) 