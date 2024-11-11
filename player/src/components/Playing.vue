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
            <Select v-model="selectedSource">
              <SelectTrigger>
                <SelectValue :placeholder="currentSource || '暂无视频源'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem 
                  v-for="source in playlistStore.currentVideoItem?.VideoSources" 
                  :key="source.id" 
                  :value="source.url"
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

const playlistStore = usePlaylistStore();
const selectedSource = ref('');
const newSource = ref('');

// 计算当前视频源
const currentSource = computed(() => {
  return playlistStore.currentVideoItem?.VideoSources[0]?.url;
});

// 监听当前视频变化,更新选中的源
watch(() => playlistStore.currentVideoItem, (newItem) => {
  // TODO: 更新选中的源
}, { immediate: true });

function addSource() {
  if (!newSource.value) {
    logger.error('新视频源URL不能为空');
    return;
  }
  // TODO: 实现添加新视频源的逻辑
  logger.info('添加新视频源:', newSource.value);
  newSource.value = '';
}

// 组件挂载时设置默认源 TODO
onMounted(() => {
  
});
</script> 