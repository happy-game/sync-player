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

const props = defineProps<{
  show: boolean
}>();

const emit = defineEmits<{
  (e: 'close'): void
}>();

const username = ref('');
const roomName = ref('');
const userStore = useUserStore();

const handleSubmit = async () => {
  try {
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