import { defineStore } from 'pinia'
import { ref } from 'vue'
import logger from '@/utils/logger'

export const usePlayerStore = defineStore('player', () => {
  const currentSource = ref('')

  function updateSource(source: string) {
    currentSource.value = source
  }


  return {
    currentSource,
    updateSource
  }
}) 