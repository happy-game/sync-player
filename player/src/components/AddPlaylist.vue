<template>
  <Card class="w-full">
    <CardHeader class="p-3 pb-1.5">
      <CardTitle class="text-base">添加视频</CardTitle>
      <CardDescription class="text-xs">将视频添加进播放列表.</CardDescription>
    </CardHeader>
    <CardContent class="p-3 pt-1.5">
      <form>
        <div class="grid items-center w-full gap-1.5">
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs" for="title">标题</Label>
            <Input class="h-8" id="title" placeholder="title" v-model="title"/>
          </div>
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs" for="url">源</Label>
            <Input class="h-8" id="url" placeholder="url" v-model="url"/>
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex justify-between px-3 py-1.5">
      <Button class="h-8 text-sm" @click="title='';url=''">清除</Button>
      <Button class="h-8 text-sm" @click="addVideo">添加</Button>
    </CardFooter>
  </Card>
</template>
  
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { usePlaylistStore } from '@/stores/playlist';
import logger from '@/utils/logger';

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'


const userStore = useUserStore();
const playlistStore = usePlaylistStore();

const title = ref('');
const url = ref('');

function addVideo() {
  logger.info('Add video');
  if (!title.value || !url.value) {
    logger.error('Title or url is empty');
    return;
  }
  if (!userStore.roomId) {
    logger.error('RoomId is empty');
    return;
  }
  playlistStore.addVideo(userStore.roomId, title.value, url.value);
}
onMounted(() => {
  logger.info('AddPlaylist mounted');
});
</script>