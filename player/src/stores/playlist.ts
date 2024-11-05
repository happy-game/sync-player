import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import logger from '@/utils/logger'

// define an interface for the playlist object
export interface PlaylistItem {
    id: number
    roomId: number
    title: string
    orderIndex: number
    playStatus: string
    createdTime: string
    VideoSources: {
        id: number
        playlistItemId: number
        url: string
        createdTime: string
        lastActiveTime: string
    }[]
}

export const usePlaylistStore = defineStore('playlist', () => {
    const playlist = ref<PlaylistItem[]>([])

    function setPlaylist(newPlaylist: PlaylistItem[]) {
        playlist.value = newPlaylist
    }

    async function addVideo(roomId: number, title:string, urls:string) {
        try {
            const response = await axios.post('/api/playlist/add', {
                roomId,
                title,
                urls
            })
            if (response.status === 200) {
                const playlistItemId = response.data.playlistItemId
                playlist.value.push({
                    id: playlistItemId,
                    roomId,
                    title,
                    orderIndex: Math.max(...playlist.value.map((video) => video.orderIndex), -1) + 1,   // FIXME: a better way to calculate orderIndex
                    playStatus: 'PENDING',
                    createdTime: new Date().toISOString(),
                    VideoSources: urls.split(',').map((url, index) => ({
                        id: index,
                        playlistItemId,
                        url,
                        createdTime: new Date().toISOString(),
                        lastActiveTime: new Date().toISOString()
                    }))
                })
            }
        }
        catch (error) {
            console.error('Failed to add video:', error)
        }
    }

    function removeVideo(videoId: number) {
        const index = playlist.value.findIndex((video) => video.id === videoId)
        if (index !== -1) {
            playlist.value.splice(index, 1)
        }
    }

    function swapVideos(fromIndex: number, toIndex: number) {
        const fromVideo = playlist.value[fromIndex]
        const toVideo = playlist.value[toIndex]
        playlist.value[fromIndex] = toVideo
        playlist.value[toIndex] = fromVideo
    }

    function clearPlaylist() {
        playlist.value = []
    }

    return {
        playlist: computed(() => playlist.value),
        setPlaylist,
        addVideo,
        removeVideo,
        swapVideos,
        clearPlaylist
    }
})
