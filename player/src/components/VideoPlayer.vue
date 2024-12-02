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
import { onMounted, onUnmounted, watch, ref } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.min.css'
import { usePlaylistStore } from '@/stores/playlist';
import { usePlayerStore } from '@/stores/player';

import logger from '@/utils/logger';
import { syncManager } from '@/utils/sync/syncManager';
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
const playerStore = usePlayerStore();

// 添加一个ref来控制同步状态
const syncEnabled = ref(true);

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
        request.post('/sync/updatePause', data);
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
  player?.on('ended', () => {
    playlistStore.switchVideo();
  });
}

async function sendSyncData() {
  if (!enable_sync || !syncEnabled.value) {
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
  if (!enable_sync || !syncEnabled.value) {  // 添加syncEnabled.value的检查
    logger.info('Sync disabled');
    return;
  }
  enable_sync = false;
  please_enable_sync = true;
  setTimeout(() => {
    enable_sync = true;
    please_enable_sync = false;
  }, 1000 * 10);  // 设置10s的等待时间， 超时后自动开启同步
  const currentTime = player?.currentTime();
  if (currentTime === undefined) {  // fucking typescript
    return;
  }
  const diff = Math.abs(currentTime - data.time);
  if (diff > syncThreshold) {
    logger.info('Updating player time', data.time);
    player?.currentTime(data.time);
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

watch(() => playlistStore.playlistChanged, async () => {
  if (player) {
    logger.info('Playlist changed');
    const syncData = await getSyncData();
    const currentVideoId = syncData?.videoId;
    // 判断是否在播放列表中
    if (!playlistStore.playlist.find((video) => video.id === currentVideoId)) {
      logger.warn('Current video is not in playlist');
      return;
    }
    if (currentVideoId !== playlistStore.currentVideoId) {
      playlistStore.switchVideo(currentVideoId);
    }
    else {
      logger.debug('Current video is already playing');
    }
    const videoSrc = playlistStore.playlist[0].VideoSources[0].url;
    player?.src({
      src: videoSrc,
      type: 'video/mp4'
    });
    updatePlayer(syncData);
    player?.play();
  }
});

watch(() => playerStore.currentSource, (newSource) => {
  if (newSource && player) {
    handleSourceChange(newSource)
  }
})

onMounted(() => {
	initPlayer();
  syncManager.subscribe('updateTime', handleUpdateTime);
  syncManager.subscribe('updatePause', handleUpdatePause);
});

onUnmounted(() => {
  syncManager.unsubscribe('updateTime', handleUpdateTime);
  syncManager.unsubscribe('updatePause', handleUpdatePause);
});

async function handleUpdateTime(data: any) {
  logger.info('Received update time', data);
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

// 添加一个处理切换视频源的函数
async function handleSourceChange(newSource: string) {
  logger.info('切换视频源:', newSource)
  if (player) {
    // 关闭同步
    enable_sync = false;
    please_enable_sync = true;
    setTimeout(() => {
      enable_sync = true;
      please_enable_sync = false;
    }, 1000 * 10);  // 设置10s的等待时间， 超时后自动开启同步
    const currentTime = player.currentTime()
    const paused = player.paused()
    
    player.src({
      src: newSource,
      type: 'video/mp4'
    })
    
    player.one('loadedmetadata', () => {
      player?.currentTime(currentTime)
      if (!paused) {
        player?.play()
      }
    })
  }
}

// 暴露方法给父组件
defineExpose({
  requestSync: async () => {
    const result = await getSyncData();
    if (result) {
      updatePlayer(result);
    }
  },
  sendSync: () => {
    sendSyncData();
  },
  toggleSync: () => {
    syncEnabled.value = !syncEnabled.value;
    enable_sync = syncEnabled.value;
    please_enable_sync = false;
    logger.info(`同步已${syncEnabled.value ? '启用' : '禁用'}`);
  },
  getSyncState: () => syncEnabled.value
});
</script>