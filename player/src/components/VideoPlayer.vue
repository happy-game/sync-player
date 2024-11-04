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

// const player = ref<Player | null>(null)
let player: Player | null = null;
const default_src = 'http://vjs.zencdn.net/v/oceans.mp4';


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
  
	player.on('seeked', () => {
		logger.info(`Video seeked to ${player.currentTime()}`);
	});

}
onMounted(() => {
	initPlayer();
});
</script>