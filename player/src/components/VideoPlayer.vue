<template>
	<div class="w-full h-screen flex items-center justify-center sm:items-start sm:justify-start">
		<video class="video-js vjs-default-skin w-full sm:w-3/4 md:w-2/3 lg:w-1/2" id="videojs-player"></video>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.min.css'
import 'videojs-playlist';
import type { PlaylistItem } from '@/types/videojs-playlist';
import { usePlaylistStore } from '@/stores/playlist';

import logger from '@/utils/logger';
import { wsManager } from '@/utils/websocket';

interface SyncData {
  time: number;
  timestamp: number;
  paused: boolean;
  videoId: number;
}

let player: Player | null = null;
let enable_sync = true;
let please_enable_sync = false;
const syncThreshold = 1;

const playlistStore = usePlaylistStore();
const playlist: PlaylistItem[] = [];  // 播放列表

function initPlayer() {
	const options = {
		controls : true,
		enableSmoothSeeking: true,
		playbackRates: [0.5, 1, 1.5, 2],
		controlBar:{
			skipButtons:{
				forward: 30,
				backward: 10
			}
		},
		userActions: {
			click: function(event: Event) {
				logger.debug('Video clicked', event);
        // 反转播放/暂停状态
        if (player) { // FIXME: 更优雅的写法
          if (player.paused()) {
            player.play();
          } else {
            player.pause();
          }
        }
        const paused = player?.paused();
        const timestamp = Date.now();

        const data = {
          paused,
          timestamp
        };
        fetch('/api/sync/updatePause', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        })
        .then(response => response.json());
			}
		}
	};
	player = videojs("videojs-player", options);
  
	if (player) {
		(player as any).playlist(playlist);		// TODO: fix this, type error
		
		// player.on('playlistitem', () => { 
		// 	const index = (player as any).playlist.currentItem();
		// 	logger.info(`Playing playlist item ${index}: ${playlist[index].title}`);
		// });

    player.on('canplay', () => {
      if (please_enable_sync) {
        enable_sync = true;
        please_enable_sync = false;
      }
    });
		
		(player as any).playlist.autoadvance(0);
	}

	player?.on('seeked', sendSyncData);
}

async function sendSyncData() {
  if (!enable_sync) {
    return;
  }
  const currentTime = player?.currentTime();
  const timestamp = Date.now();
  const paused = player?.paused();
  const videoId = playlistStore.currentVideoId;

  const data = {
    time: currentTime,
    timestamp,
    paused,
    videoId
  };
  try {
    const response = await fetch('/api/sync/updateTime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    logger.info('Sync data sent', result);
  } catch (error) {
    logger.error('Error sending sync data', error);
  }
}

async function updatePlayer(data: SyncData) {
  if (!enable_sync) {
    logger.info('Sync disabled');
    return;
  }
  enable_sync = false;
  please_enable_sync = true;  
  const currentTime = player?.currentTime();
  if (currentTime === undefined) {  // fucking typescript
    return;
  }
  const diff = Math.abs(currentTime - data.time);
  if (diff > syncThreshold) {
    logger.info('Updating player time', data.time);
    player?.currentTime(data.time);
    // if (data.paused) {
    //   player?.pause();
    // } else {
    //   player?.play();
    // }
    player?.play(); // FIXME: always play
    logger.info('Player time updated');
  }
  else {
    logger.info('Player time is already in sync', currentTime, data.time, diff);
  }
}

async function getSyncData() {
  // const videoId = 1;  // TODO
  try {
    const response = await fetch(`/api/sync/query`);
    const result = await response.json();
    logger.info('Sync data received', result);
	updatePlayer(result);
  } catch (error) {
    logger.error('Error getting sync data', error);
  }
}

watch(() => playlistStore.playlistChanged, (newPlaylist) => {
  if (player) {
    logger.info('Playlist changed');
    // 从 playlistStore 中提取播放列表数据并转换为 videojs-playlist 需要的格式
    const videojsPlaylist = playlistStore.playlist.map(item => ({
      sources: item.VideoSources.map(source => ({
        src: source.url,
        type: 'video/mp4' // TODO: 从 source.url 中推断
      })),
      poster: '', 
      title: item.title,
      id: item.id
    }));
    // 更新播放器的播放列表
    (player as any).playlist(videojsPlaylist);
    
    // 如果播放列表不为空，开始播放第一个视频
    if (videojsPlaylist.length > 0) {
      (player as any).playlist.currentItem(0);
      player.play();
    }
  }
});

onMounted(() => {
	initPlayer();
	wsManager.subscribe('updateTime', handleUpdateTime);
  wsManager.subscribe('updatePause', handleUpdatePause);
});

onUnmounted(() => {
	wsManager.unsubscribe('updateTime', handleUpdateTime);
  wsManager.unsubscribe('updatePause', handleUpdatePause);
});

function handleUpdateTime(data: any) {
  logger.info('Received update time', data);
	updatePlayer(data);
}

function handleUpdatePause(data: any) {
  logger.info('Received update pause', data);
  if (data.paused) {
    player?.pause();
  } else {
    player?.play();
  }
}
</script>