<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-96">
      <h2 class="text-xl font-bold mb-4">设置</h2>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Base URL</label>
          <input 
            v-model="newBaseUrl" 
            type="text" 
            class="w-full px-3 py-2 border rounded-lg"
            required
          >
        </div>
        <div class="flex justify-end gap-2">
          <button 
            type="button" 
            @click="closeModal" 
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            确认
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { updateAxiosBaseUrl } from '@/utils/axios';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const props = defineProps<{
  show: boolean
}>();

const emit = defineEmits<{
  (e: 'close'): void
}>();

const newBaseUrl = ref('');

const handleSubmit = () => {
  // save to cookie
  document.cookie = `urlConfig=${JSON.stringify({
    apiBaseUrl: newBaseUrl.value,
  })}; path=/`;
  updateAxiosBaseUrl(newBaseUrl.value);

  userStore.connectWebSocket();
  closeModal();
};

const closeModal = () => {
  emit('close');
};
</script> 