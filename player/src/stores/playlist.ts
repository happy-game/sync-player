import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import request from '@/utils/axios'
import logger from '@/utils/logger'

// VideoSource interface
export interface VideoSource {
  id: number
  playlistItemId: number
  url: string
  label: string
  createdTime: string
  lastActiveTime: string
}

// VideoSource input for API calls
export interface VideoSourceInput {
  url: string
  label: string
}

// PlaylistItem interface
export interface PlaylistItem {
  id: number
  roomId: number
  title: string
  orderIndex: number
  playStatus: string
  createdTime: string
  videoSources: VideoSource[]
}

export enum PlayStatus {
  NEW = 'new',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export const usePlaylistStore = defineStore('playlist', () => {
  const playlist = ref<PlaylistItem[]>([])
  const playlistLength = computed(() => playlist.value.length)

  const currentVideoId = computed(() => {
    const playingItem = playlist.value.find((video) => video.playStatus === PlayStatus.PLAYING)
    return playingItem ? playingItem.id : -1
  })

  const currentVideoItem = computed(() => {
    return playlist.value.find((video) => video.playStatus === PlayStatus.PLAYING)
  })

  // Fetch playlist from server
  async function fetchPlaylist(roomId: number): Promise<void> {
    try {
      const response = await request.get('/playlist/query', { params: { roomId } })
      playlist.value = response.data
    } catch (error) {
      logger.error('Failed to fetch playlist:', error)
      throw error
    }
  }

  function setPlaylist(newPlaylist: PlaylistItem[]): void {
    playlist.value = newPlaylist
  }

  async function addVideo(roomId: number, title: string, sources: VideoSourceInput[]): Promise<void> {
    try {
      await request.post('playlist/add', { title, sources })
      // Refetch playlist to ensure consistency with server
      await fetchPlaylist(roomId)
    } catch (error) {
      logger.error('Failed to add video:', error)
      throw error
    }
  }

  async function deleteVideo(roomId: number, videoId: number): Promise<void> {
    try {
      await request.delete('playlist/delete', { data: { playlistItemId: videoId } })
      await fetchPlaylist(roomId)
    } catch (error) {
      logger.error('Failed to delete video:', error)
      throw error
    }
  }

  async function swapVideos(roomId: number, fromId: number, toId: number): Promise<void> {
    const fromIndex = playlist.value.findIndex((video) => video.id === fromId)
    const toIndex = playlist.value.findIndex((video) => video.id === toId)

    if (fromIndex === -1 || toIndex === -1) {
      logger.error('Video not found in playlist')
      return
    }

    const orderIndexList = [
      { playlistItemId: fromId, orderIndex: playlist.value[toIndex].orderIndex },
      { playlistItemId: toId, orderIndex: playlist.value[fromIndex].orderIndex }
    ]

    try {
      await request.post('playlist/updateOrder', { orderIndexList })
      await fetchPlaylist(roomId)
    } catch (error) {
      logger.error('Failed to swap videos:', error)
      throw error
    }
  }

  async function clearPlaylist(roomId: number): Promise<void> {
    try {
      await request.delete('playlist/clear', { data: { roomId } })
      playlist.value = []
    } catch (error) {
      logger.error('Failed to clear playlist:', error)
      throw error
    }
  }

  async function switchVideo(roomId: number, videoId?: number): Promise<void> {
    try {
      if (videoId === undefined) {
        const nextVideo = playlist.value.find((video) => video.playStatus === PlayStatus.NEW)
        if (!nextVideo) {
          logger.warn('No next video to play')
          return
        }
        videoId = nextVideo.id
      }

      await request.post('playlist/switch', { playlistItemId: videoId })
      // Refetch playlist to ensure consistency with server
      await fetchPlaylist(roomId)
    } catch (error) {
      logger.error('Failed to switch video:', error)
      throw error
    }
  }
  return {
    playlist,
    playlistLength,
    currentVideoId,
    currentVideoItem,
    fetchPlaylist,
    setPlaylist,
    addVideo,
    deleteVideo,
    swapVideos,
    clearPlaylist,
    switchVideo
  }
})
