<template>
	<div class="w-full h-full">
		<video
			id="videojs-player"
			class="video-js vjs-big-play-centered w-full h-full"
		>
			<p class="vjs-no-js">
				To view this video please enable JavaScript, and consider upgrading to a
				web browser that supports HTML5 video
			</p>
		</video>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.min.css'
import { usePlaylistStore } from '@/stores/playlist';

import logger from '@/utils/logger';
import { wsManager } from '@/utils/websocket';
import request from '@/utils/axios';

interface SyncData {
  time: number;
  timestamp: number;
  paused: boolean;
  videoId: number;
}

let player: Player | null = null;
let enable_sync = true;
let please_enable_sync = false;
let current_video_id = 0;
const syncThreshold = 1;

const playlistStore = usePlaylistStore();

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
    player.on('canplay', () => {
      if (please_enable_sync) {
        enable_sync = true;
        please_enable_sync = false;
      }
    });
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
    const response = await request.post('/sync/updateTime', data);
    const result = response.data;
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
  try {
    const response = await request.get(`/sync/query`);
    const result = response.data;
    logger.info('Sync data received', result);
    return result;
  } catch (error) {
    logger.error('Error getting sync data', error);
    return null;
  }
}

watch(() => playlistStore.playlistChanged, () => {
  if (player) {
    logger.info('Playlist changed');
    if (playlistStore.currentVideoItem) {
      if (playlistStore.currentVideoId !== current_video_id) {
        current_video_id = playlistStore.currentVideoId;
        player.src({
          src: playlistStore.currentVideoItem?.VideoSources[0].url,
          type: 'video/mp4'
        });
        player.play();
      }
      else {
        logger.debug('Current video is already playing');
      }
    }
    else {
      logger.error('Current video item is null');
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

async function handleUpdateTime(data: any) {
  logger.info('Received update time', data);
	// updatePlayer(data);
  const result = await getSyncData();  // FIXME: 目标设备会大约快 2s, 检查时间计算逻辑
  if (result) {
    updatePlayer(result);
  }
}

async function handleUpdatePause(data: any) {
  logger.info('Received update pause', data);
  const result = await getSyncData();
  if (result) {
    const paused = result.paused;
    if (paused) {
      player?.pause();
    } else {
      player?.play();
    }
  }
}
</script>