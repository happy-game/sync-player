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
export enum PlayStatus {
  NEW = 'new',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

export const usePlaylistStore = defineStore('playlist', () => {
  const playlist = ref<PlaylistItem[]>([]);
  const playlistLength = computed(() => playlist.value.length);
  const playlistChanged = ref(false);
  // current playing video id is the id of the playlist item whose playStatus is PLAYING
  const currentVideoId = computed(() => {
    const playingItem = playlist.value.find((video) => video.playStatus === PlayStatus.PLAYING);
    return playingItem ? playingItem.id : -1;
  });
  const currentVideoItem = computed(() => {
    return playlist.value.find((video) => video.playStatus === PlayStatus.PLAYING);
  });

  function setPlaylist(newPlaylist: PlaylistItem[]) {
    playlist.value = newPlaylist;
    switchVideo(playlist.value[0].id);  // TODO: use /sync/query to get the current playing video
    // playlistChanged.value = !playlistChanged.value; // FIXME: a better way to trigger the playlist update
  }

  async function addVideo(roomId: number, title:string, urls:string) {
    try {
      const response = await axios.post('/api/playlist/add', {
        roomId,
        title,
        urls
      });
      if (response.status === 200) {
        const playlistItemId = response.data.playlistItemId
        playlist.value.push({
          id: playlistItemId,
          roomId,
          title,
          orderIndex: Math.max(...playlist.value.map((video) => video.orderIndex), -1) + 1,   // FIXME: a better way to calculate orderIndex
          playStatus: PlayStatus.NEW,
          createdTime: new Date().toISOString(),
          VideoSources: urls.split(',').map((url, index) => ({
              id: index,
              playlistItemId,
              url,
              createdTime: new Date().toISOString(),
              lastActiveTime: new Date().toISOString()
          }))
        });
        // playlistChanged.value = !playlistChanged.value; // FIXME: a better way to trigger the playlist update
      }
    }
    catch (error) {
      logger.error('Failed to add video:', error);
    }
  }

  async function deleteVideo(videoId: number) {
    try {
      await axios.delete('/api/playlist/delete', { data: { playlistItemId: videoId } });
      playlist.value = playlist.value.filter((video) => video.id !== videoId);
    }
    catch (error) {
      logger.error('Failed to delete video:', error);
    }
  }

  async function swapVideos(fromId: number, toId: number) {
    const fromIndex = playlist.value.findIndex((video) => video.id === fromId);
    const toIndex = playlist.value.findIndex((video) => video.id === toId);

    const fromOrderIndex = playlist.value[fromIndex].orderIndex;
    const toOrderIndex = playlist.value[toIndex].orderIndex;
    // orderIndexList is an array of { playlistItemId: number, orderIndex: number }
    const orderIndexList = [
      { playlistItemId: fromId, orderIndex: toOrderIndex },
      { playlistItemId: toId, orderIndex: fromOrderIndex }
    ];
    try {
      // update the orderIndex of the two videos in the server
      await axios.post('/api/playlist/updateOrder', { orderIndexList  });
      const temp = playlist.value[fromIndex];

      // swap the two videos in local playlist
      playlist.value[fromIndex] = playlist.value[toIndex];
      playlist.value[fromIndex].orderIndex = fromOrderIndex;
      playlist.value[toIndex] = temp;
      playlist.value[toIndex].orderIndex = toOrderIndex;
    }
    catch (error) {
      logger.error('Failed to swap videos:', error);
    }
  }

  async function clearPlaylist(roomId: number) {
    logger.info('Clearing playlist in roomId', roomId);
    try {
      await axios.delete('/api/playlist/clear', { data: { roomId: roomId } });
      playlist.value = [];
    }
    catch (error) {
      logger.error('Failed to clear playlist:', error);
    }
  }

  async function switchVideo(videoId: number){
    try {
      await axios.post('/api/playlist/switch', { playlistItemId: videoId });
      if (currentVideoId.value !== -1) {
        // Remove the currently playing video
        playlist.value = playlist.value.filter((video) => video.id !== currentVideoId.value);
      }
      // Move the videoId video to the first position and set its status to playing
      const videoIndex = playlist.value.findIndex((video) => video.id === videoId);
      if (videoIndex !== -1) {
        const video = playlist.value.splice(videoIndex, 1)[0];
        video.playStatus = PlayStatus.PLAYING;
        playlist.value.unshift(video);
      }
      playlistChanged.value = !playlistChanged.value; // FIXME: a better way to trigger the playlist update
    }
    catch (error) {
      logger.error('Failed to switch video:', error);
    }
  }
  return {
    playlist,
    playlistLength,
    playlistChanged,
    currentVideoId,
    currentVideoItem,
    setPlaylist,
    addVideo,
    deleteVideo,
    swapVideos,
    clearPlaylist,
    switchVideo
  }
});
