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
import { onMounted, onUnmounted, watch } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.min.css'
import { usePlaylistStore } from '@/stores/playlist';
import { usePlayerStore, SyncState } from '@/stores/player';
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

const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const userStore = useUserStore();

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
  player?.on('ended', handleVideoEnded);
}

async function sendSyncData() {
  if (!playerStore.isSyncEnabled) {
    logger.debug('Sync disabled, skipping sendSyncData');
    return;
  }
  
  // 检查是否是被抑制的 seek
  if (playerStore.consumeSuppressedSeek()) {
    logger.debug('Suppressed seek consumed, skipping sendSyncData');
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
  if (!playerStore.isSyncEnabled) {
    logger.debug('Sync disabled, skipping updatePlayer');
    return;
  }

  const currentTime = player?.currentTime();
  if (currentTime === undefined) {  // fucking typescript
    return;
  }
  
  const diff = Math.abs(currentTime - data.time);
  const threshold = playerStore.syncThreshold;
  
  if (diff > threshold) {
    logger.info(`Updating player time from ${currentTime} to ${data.time} (diff: ${diff}s)`);
    


    
    // 抑制这次 seek 事件
    playerStore.suppressNextSeek();
    player?.currentTime(data.time);
    
    player?.play(); // FIXME: always play
    logger.info('Player time updated');
  }
  else {
    logger.info('Player time is already in sync', currentTime, data.time, diff);
  }
}

async function getSyncData(): Promise<SyncData | null> {
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

async function handleVideoEnded() {
  logger.info('Video ended, switching to next video');
  if (userStore.roomId) {
    playlistStore.switchVideo(userStore.roomId);
  }
}

async function handleUpdateTime(data: any) {
  if (!playerStore.isSyncEnabled) {
    logger.debug('Sync disabled, ignoring updateTime message');
    return;
  }
  
  logger.info('Received update time message', data);
  const result = await getSyncData();
  if (result) {
    updatePlayer(result);
  }
}

async function handleUpdatePause(data: any) {
  if (!playerStore.isSyncEnabled) {
    logger.debug('Sync disabled, ignoring updatePause message');
    return;
  }
  
  logger.info('Received update pause message', data);
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

async function handleSourceChange(newSource: string, options?: { preserveTime?: boolean; autoPlay?: boolean }) {
  logger.info('Switching video source:', newSource);
  
  if (!player) {
    logger.warn('Player not initialized');
    return;
  }
  
  const shouldPreserveTime = options?.preserveTime ?? false;
  const currentTime = shouldPreserveTime ? player.currentTime() : 0;
  
  // 如果明确指定了 autoPlay，使用指定值；否则继承当前播放状态
  const shouldAutoPlay = options?.autoPlay ?? !player.paused();
  
  player.src({
    src: newSource,
    type: 'video/mp4'
  });
  
  player.one('loadedmetadata', () => {
    logger.debug('Video metadata loaded, restoring playback state');
    
    if (currentTime > 0) {
      // 抑制恢复时间时的 seek 事件
      playerStore.suppressNextSeek();
      player?.currentTime(currentTime);
    }
    
    if (shouldAutoPlay) {
      player?.play();
    }
  });
}

// 监听播放列表当前视频变化
watch(() => playlistStore.currentVideoId, async (newVideoId) => {
  if (player && newVideoId && newVideoId !== -1) {
    logger.info('Current video changed:', newVideoId);
    const currentVideo = playlistStore.currentVideoItem;

    if (!currentVideo || !currentVideo.videoSources || currentVideo.videoSources.length === 0) {
      logger.warn('No video sources available');
      return;
    }

    const videoSrc = currentVideo.videoSources[0].url;
    
    // 切换到新视频，从头开始播放
    handleSourceChange(videoSrc, { preserveTime: false, autoPlay: true });

    // 获取同步数据并更新播放器
    const syncData = await getSyncData();
    if (syncData) {
      updatePlayer(syncData);
    }
  }
});

// 监听视频源变化（用于手动切换源，保留播放时间）
watch(() => playerStore.currentSource, (newSource) => {
  if (newSource && player) {
    handleSourceChange(newSource, { preserveTime: true });
  }
});

onMounted(() => {
	logger.info('VideoPlayer mounted, initializing...');
	initPlayer();
  syncManager.subscribe('updateTime', handleUpdateTime);
  syncManager.subscribe('updatePause', handleUpdatePause);
});

onUnmounted(() => {
  logger.info('VideoPlayer unmounting, cleaning up...');
  
  syncManager.unsubscribe('updateTime', handleUpdateTime);
  syncManager.unsubscribe('updatePause', handleUpdatePause);
  
  if (player) {
    player.dispose();
    player = null;
  }
  
  playerStore.cleanup();
});

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
    playerStore.toggleSync();
    logger.info(`Sync toggled: ${playerStore.isSyncEnabled ? 'enabled' : 'disabled'}`);
  },
  getSyncState: () => playerStore.isSyncEnabled,
  getSyncStateEnum: () => playerStore.syncState
});
</script>