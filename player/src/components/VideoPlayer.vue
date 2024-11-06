<template>
	<div class="w-full h-screen flex items-center justify-center sm:items-start sm:justify-start">
		<video class="video-js vjs-default-skin w-full sm:w-3/4 md:w-2/3 lg:w-1/2" id="videojs-player"></video>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.min.css'
import logger from '../utils/logger';
import 'videojs-playlist';
import type { PlaylistItem } from '../types/videojs-playlist';

// const player = ref<Player | null>(null)
let player: Player | null = null;
const default_src = 'http://vjs.zencdn.net/v/oceans.mp4';
let enable_sync = false;

const playlist: PlaylistItem[] = [
	{
		sources: [{
			src: 'http://vjs.zencdn.net/v/oceans.mp4',
			type: 'video/mp4'
		}],
		poster: 'http://vjs.zencdn.net/v/oceans.png',
		title: 'Oceans'
	},
	{
		sources: [{
			src: 'http://media.w3.org/2010/05/bunny/movie.mp4',
			type: 'video/mp4'
		}],
		poster: 'http://media.w3.org/2010/05/bunny/poster.png',
		title: 'Bunny'
	}
];

function initPlayer() {
	const options = {
		sources: [{
			src: default_src,
			type: 'video/mp4'
		}],
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
			}
		}
	};
	player = videojs("videojs-player", options);
  
	if (player) {
		(player as any).playlist(playlist);		// TODO: fix this, type error
		
		player.on('playlistitem', () => { 
			const index = (player as any).playlist.currentItem();
			logger.info(`Playing playlist item ${index}: ${playlist[index].title}`);
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
  const videoId = 1;  // TODO

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

async function getSyncData() {
  // const videoId = 1;  // TODO
  if (enable_sync) {
    enable_sync = false;
    setInterval(() => {
      enable_sync = true;
    }, 1000 * 3);
  }
  try {
    const response = await fetch(`/api/sync/query`);
    const result = await response.json();
    logger.info('Sync data received', result);
    if (result.time) {
      player?.currentTime(result.time);
      if (result.paused) {
        player?.pause();
      } else {
        player?.play();
      }
    }
  } catch (error) {
    logger.error('Error getting sync data', error);
  }
}

onMounted(() => {
	initPlayer();
});
</script>