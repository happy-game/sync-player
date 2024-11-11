<template>
  <Card class="w-[350px]">
    <CardHeader>
      <CardTitle>当前播放</CardTitle>
      <CardDescription>当前正在播放的视频.</CardDescription>
    </CardHeader>
    <CardContent>
      <form>
        <div class="grid items-center w-full gap-4">
          <div class="flex flex-col space-y-1.5">
            <Label for="title">标题</Label>
            <Input id="title" :value="playlistStore.currentVideoItem?.title" disabled/>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="source">视频源</Label>
            <Select v-model="selectedSourceIndex">
              <SelectTrigger>
                <SelectValue :placeholder="'暂无视频源'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="(source, index) in playlistStore.currentVideoItem?.VideoSources" 
                  :key="source.id" 
                  :value="index"
                >
                  {{ source.url }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col space-y-1.5">
            <Label for="newSource">新增视频源</Label>
            <div class="flex gap-2">
              <Input id="newSource" v-model="newSource" placeholder="输入新的视频源URL"/>
              <Button variant="outline" size="icon" @click="addSource">
                <Plus class="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { usePlaylistStore } from '@/stores/playlist';
import { Plus } from 'lucide-vue-next';
import logger from '@/utils/logger';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlayerStore } from '@/stores/player'

const playlistStore = usePlaylistStore();
const selectedSourceIndex = ref(0);
const newSource = ref('');
const playerStore = usePlayerStore();

// 计算当前视频源
const currentSource = computed(() => {
  return playlistStore.currentVideoItem?.VideoSources[0]?.url;
});

// 监听当前视频变化,更新选中的源
watch(() => playlistStore.currentVideoId, (newId) => {
  if (newId && playlistStore.currentVideoItem) {
    // 重置为第一个源
    selectedSourceIndex.value = 0;
    // 通知播放器更新源
    if (playlistStore.currentVideoItem.VideoSources.length > 0) {
      playerStore.updateSource(playlistStore.currentVideoItem.VideoSources[0].url);
    }
  }
}, { immediate: true });

// 监听选中源的变化
watch(selectedSourceIndex, (newIndex) => {
  if (playlistStore.currentVideoItem?.VideoSources[newIndex]) {
    const newSource = playlistStore.currentVideoItem.VideoSources[newIndex].url;
    logger.info('选中的视频源索引:', newIndex, '源:', newSource);
    playerStore.updateSource(newSource);
  }
});

function addSource() {
  if (!newSource.value) {
    logger.error('新视频源URL不能为空');
    return;
  }

  logger.info('添加新视频源:', newSource.value);
  // TODO: 实现添加源到数据库的逻辑
  newSource.value = '';
}
</script> 