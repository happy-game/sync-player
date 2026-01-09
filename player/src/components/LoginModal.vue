<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-96">
      <h2 class="text-xl font-bold mb-4">登录</h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">用户名</label>
          <input 
            v-model="username" 
            type="text" 
            class="w-full px-3 py-2 border rounded-lg"
            required
          >
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">房间名</label>
          <input 
            v-model="roomName" 
            type="text" 
            class="w-full px-3 py-2 border rounded-lg"
            required
          >
        </div>
        
        <!-- 高级选项下拉按钮 -->
        <div class="mb-4">
          <button 
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <span class="transform transition-transform" :class="{ 'rotate-180': showAdvanced }">
              ▼
            </span>
            高级选项
          </button>
        </div>

        <!-- 高级选项内容 -->
        <div v-show="showAdvanced" class="space-y-4 mb-4">
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1">API Base URL</label>
            <input 
              v-model="apiBaseUrl" 
              type="text" 
              class="w-full px-3 py-2 border rounded-lg"
              :placeholder="defaultApiBaseUrl"
            >
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button 
            type="button" 
            @click="skipLogin" 
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            跳过
          </button>
          <button 
            type="submit" 
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            登录
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '../stores/user';
import { env } from '../config/env';
import { updateAxiosBaseUrl } from '@/utils/axios';
import { CookieManager, COOKIE_NAMES, type UrlConfigCookie } from '@/utils/cookies';

const props = defineProps<{
  show: boolean
}>();

const emit = defineEmits<{
  (e: 'close'): void
}>();

const username = ref('');
const roomName = ref('');
const userStore = useUserStore();

const apiBaseUrl = ref('');
const showAdvanced = ref(false);

const defaultApiBaseUrl = env.API_BASE_URL;

const handleSubmit = async () => {
  try {
    if (apiBaseUrl.value) {
      CookieManager.setJSON<UrlConfigCookie>(COOKIE_NAMES.URL_CONFIG, {
        apiBaseUrl: apiBaseUrl.value,
      });
      updateAxiosBaseUrl(apiBaseUrl.value);
    }
    
    await userStore.login(username.value, roomName.value);
    emit('close');
  } catch (error) {
    alert('登录失败，请重试');
  }
};

const skipLogin = () => {
  emit('close');
};
</script> 