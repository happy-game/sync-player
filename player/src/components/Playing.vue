<template>
  <Card class="w-full">
    <CardHeader class="p-3 pb-1.5">
      <CardTitle class="text-base">当前播放</CardTitle>
      <CardDescription class="text-xs">当前正在播放的视频.</CardDescription>
    </CardHeader>
    <CardContent class="p-3 pt-1.5">
      <form @submit.prevent>
        <div class="grid items-center w-full gap-1.5">
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs" for="title">标题</Label>
            <Input class="h-8" id="title" :value="playlistStore.currentVideoItem?.title" disabled/>
          </div>
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs" for="source">视频源</Label>
            <Select v-model="selectedSourceIndex">
              <SelectTrigger class="h-8">
                <SelectValue :placeholder="'暂无视频源'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="(source, index) in playlistStore.currentVideoItem?.videoSources"
                  :key="source.id"
                  :value="String(index)"
                  class="truncate"
                >
                  <span class="truncate block max-w-[280px]">{{ source.url }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs" for="newSource">新增视频源</Label>
            <div class="flex gap-1.5">
              <Input class="h-8" id="newSource" v-model="newSource" placeholder="输入新的视频源URL"/>
              <Button type="button" class="h-8 w-8" variant="outline" size="icon" @click="addSource">
                <Plus class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div class="flex flex-col space-y-0.5">
            <Label class="text-xs">本地文件</Label>
            <div class="flex gap-1.5">
              <Button class="h-8" variant="outline" @click="handleLocalFile">
                <FolderOpen class="h-3.5 w-3.5 mr-1" />
                选择文件
              </Button>
              <input
                ref="fileInput"
                type="file"
                accept="video/*"
                class="hidden"
                @change="onFileSelected"
              />
            </div>
          </div>
        </div>
      </form>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { usePlaylistStore } from '@/stores/playlist';
import { Plus, FolderOpen } from 'lucide-vue-next';
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
const selectedSourceIndex = ref('0');
const newSource = ref('');
const playerStore = usePlayerStore();

const fileInput = ref<HTMLInputElement | null>(null);

function handleLocalFile() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const localUrl = URL.createObjectURL(file);
    logger.info('选择本地文件:', file.name);
    playerStore.updateSource(localUrl);
    
    // 清空input的值，这样同一个文件可以重复选择
    input.value = '';
  }
}

// 计算当前视频源
const currentSource = computed(() => {
  return playlistStore.currentVideoItem?.videoSources[0]?.url;
});

// 监听当前视频变化,更新选中的源
// watch(() => playlistStore.currentVideoId, (newId) => {
//   if (newId && playlistStore.currentVideoItem) {
//     selectedSourceIndex.value = '0';
//     if (playlistStore.currentVideoItem.videoSources.length > 0) {
//       playerStore.updateSource(playlistStore.currentVideoItem.videoSources[0].url);
//     }
//   }
// }, { immediate: true });

// 监听选中源的变化
watch(selectedSourceIndex, (newIndex) => {
  const index = parseInt(newIndex);
  if (playlistStore.currentVideoItem?.videoSources[index]) {
    const newSource = playlistStore.currentVideoItem.videoSources[index].url;
    logger.info('选中的视频源索引:', index, '源:', newSource);
    playerStore.updateSource(newSource);
  }
});

function addSource() {
  if (!newSource.value) {
    logger.error('新视频源URL不能为空');
    return;
  }

  logger.error('该功能未实现');
  newSource.value = '';
}
</script> 