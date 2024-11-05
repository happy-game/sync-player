import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

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

    return {
        playlist: computed(() => playlist.value),
        setPlaylist,
    }
})
