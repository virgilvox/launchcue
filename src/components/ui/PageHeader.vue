<template>
  <div class="flex flex-col sm:flex-row justify-between items-center mb-6">
    <div class="mb-3 sm:mb-0">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ subtitle }}</p>
    </div>
    
    <div class="flex flex-wrap items-center gap-2">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
});
</script> 