<template>
  <!-- <Card>
    <CardHeader>
      <CardTitle>添加视频</CardTitle>
    </CardHeader>
    <CardContent>
      <Input v-model="title" placeholder="标题" />
      <Input v-model="url" placeholder="URL" />
    </CardContent>
    <CardFooter>
      <Button @click="addVideo">添加</Button>
    </CardFooter>
  </Card> -->
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>添加视频</CardTitle>
      <CardDescription>将视频添加进播放列表.</CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div class="grid items-center w-full gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="title">标题</Label>
            <Input id="title" placeholder="title" v-model="title"/>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="url">源</Label>
            <Input id="url" placeholder="url" v-model="url"/>
          </div>
        </div>
      </form>
    </CardContent>
    <CardFooter class="flex justify-between px-6 pb-6">
      <Button @click="title='';url=''">清除</Button>
      <Button @click="addVideo">添加</Button>
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