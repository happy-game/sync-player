<template>
  <a 
    v-if="icpNumber" 
    :href="'https://beian.miit.gov.cn/'" 
    target="_blank" 
    class="text-xs text-gray-500 hover:text-gray-700"
  >
    {{ icpNumber }}
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { env } from '../config/env';

const icpNumber = computed(() => env.ICP_NUMBER || '');
</script> 