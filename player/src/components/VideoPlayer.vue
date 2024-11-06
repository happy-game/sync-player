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

	player?.on('seeked', () => {
		logger.info(`Video seeked to ${player?.currentTime()}`);
	});
}
onMounted(() => {
	initPlayer();
});
</script>