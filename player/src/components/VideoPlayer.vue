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
import { useUserStore } from '@/stores/user';

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
// 用于防止 seek 事件循环的计数器
let suppressSeekCount = 0;

const syncThreshold = 1;

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();

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
    if (import.meta.env.DEV) {
      console.log('Exposing player and videojs to window for debugging');
      (window as any).player = player;
      (window as any).videojs = videojs;
    }


	}

	player?.on('seeked', sendSyncData);
  player?.on('ended', () => {
    if (userStore.roomId) {
      playlistStore.switchVideo(userStore.roomId);
    }
  });
}

async function sendSyncData() {
  if (!syncEnabled.value) {
    return;
  }
  
  // 如果计数器大于0，说明是系统触发的 seek，消耗一次计数并不发送同步
  if (suppressSeekCount > 0) {
    suppressSeekCount--;
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
  if (!syncEnabled.value) {  // 添加syncEnabled.value的检查
    logger.info('Sync disabled');
    return;
  }

  const currentTime = player?.currentTime();
  if (currentTime === undefined) {  // fucking typescript
    return;
  }
  const diff = Math.abs(currentTime - data.time);
  if (diff > syncThreshold) {
    logger.info('Updating player time', data.time);
    
    // 标记这次 seek 是内部触发的，应该被忽略
    suppressSeekCount++;
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

watch(() => playlistStore.currentVideoId, async (newVideoId) => {
  if (player && newVideoId && newVideoId !== -1) {
    logger.info('Current video changed:', newVideoId);
    const currentVideo = playlistStore.currentVideoItem;

    if (!currentVideo || !currentVideo.videoSources || currentVideo.videoSources.length === 0) {
      logger.warn('No video sources available');
      return;
    }

    const videoSrc = currentVideo.videoSources[0].url;
    player?.src({
      src: videoSrc,
      type: 'video/mp4'
    });

    const syncData = await getSyncData();
    if (syncData) {
      updatePlayer(syncData);
    }
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
    // enable_sync = false;
    // please_enable_sync = true;
    // setTimeout(() => {
    //   enable_sync = true;
    //   please_enable_sync = false;
    // }, 1000 * 10);  // 设置10s的等待时间， 超时后自动开启同步
    const currentTime = player.currentTime()
    const paused = player.paused()
    
    player.src({
      src: newSource,
      type: 'video/mp4'
    })
    
    player.one('loadedmetadata', () => {
      // 恢复时间也会触发 seek，需要抑制
      suppressSeekCount++;
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
    logger.info(`同步已${syncEnabled.value ? '启用' : '禁用'}`);
  },
  getSyncState: () => syncEnabled.value
});
</script>