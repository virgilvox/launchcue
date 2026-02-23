<template>
  <div :class="['bg-white dark:bg-gray-800 rounded-lg shadow-md', padding, className]">
    <div v-if="title || $slots.header" class="flex items-center justify-between mb-4">
      <div>
        <h3 v-if="title" class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ title }}</h3>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="header"></slot>
    </div>
    <slot></slot>
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  compact: {
    type: Boolean,
    default: false
  },
  className: {
    type: String,
    default: ''
  }
})

const padding = computed(() => props.compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6')
</script>
