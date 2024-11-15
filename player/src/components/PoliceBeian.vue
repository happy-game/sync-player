<template>
  <a 
    v-if="policeNumber" 
    :href="`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${extractNumber}`" 
    target="_blank" 
    class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
  >
    <img src="@/assets/police-badge.png" alt="公安备案图标" class="h-4">
    {{ policeNumber }}
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { env } from '../config/env';

const policeNumber = computed(() => env.POLICE_NUMBER || '');
const extractNumber = computed(() => {
  const match = policeNumber.value.match(/\d+/);
  return match ? match[0] : '';
});
</script> 