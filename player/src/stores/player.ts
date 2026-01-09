import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import logger from '@/utils/logger'

// 同步状态枚举
export enum SyncState {
  ENABLED = 'enabled',    // 正常同步状态
  DISABLED = 'disabled'   // 用户手动禁用同步
}

export const usePlayerStore = defineStore('player', () => {
  // 状态
  const currentSource = ref('')
  const syncState = ref<SyncState>(SyncState.ENABLED)
  const syncThreshold = ref(1)  // 同步阈值（秒）
  const suppressSeekCount = ref(0) // Seek 抑制计数器

  // 计算属性
  const isSyncEnabled = computed(() => syncState.value === SyncState.ENABLED)

  // Actions
  function updateSource(source: string) {
    currentSource.value = source
    logger.debug('Video source updated:', source)
  }

  function enableSync() {
    syncState.value = SyncState.ENABLED
    logger.info('Sync enabled')
  }

  function disableSync() {
    syncState.value = SyncState.DISABLED
    logger.info('Sync disabled by user')
  }

  function toggleSync() {
    if (syncState.value === SyncState.DISABLED) {
      enableSync()
    } else {
      disableSync()
    }
  }

  // 抑制下一个 seek 事件
  function suppressNextSeek() {
    suppressSeekCount.value++

    // 2秒后自动释放一个计数，防止计数器永久不归零
    setTimeout(() => {
      if (suppressSeekCount.value > 0) {
        suppressSeekCount.value--
        logger.debug('Seek suppression token timed out, count decremented by safety net')
      }
    }, 2000)

    logger.debug('Seek suppressed, count:', suppressSeekCount.value)
  }

  // 检查并消费一个被抑制的 seek
  function consumeSuppressedSeek(): boolean {
    if (suppressSeekCount.value > 0) {
      suppressSeekCount.value--
      logger.debug('Consumed suppressed seek, remaining:', suppressSeekCount.value)
      return true
    }
    return false
  }

  function clearSuppressedSeeks() {
    suppressSeekCount.value = 0
  }

  // 清理所有资源（组件卸载时调用）
  function cleanup() {
    suppressSeekCount.value = 0
    logger.debug('PlayerStore cleaned up')
  }

  return {
    // 状态
    currentSource,
    syncState,
    syncThreshold,

    // 计算属性
    isSyncEnabled,

    // Actions
    updateSource,
    enableSync,
    disableSync,
    toggleSync,
    suppressNextSeek,
    consumeSuppressedSeek,
    clearSuppressedSeeks,
    cleanup
  }
})