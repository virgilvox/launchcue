<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
      <component :is="icon" v-if="icon" class="h-6 w-6 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">{{ description }}</p>
    <slot name="action">
      <button
        v-if="actionLabel"
        class="btn btn-primary btn-sm"
        @click="$emit('action')"
      >
        <PlusIcon class="h-4 w-4 mr-1" />
        {{ actionLabel }}
      </button>
    </slot>
  </div>
</template>

<script setup>
import { PlusIcon } from '@heroicons/vue/24/outline'

defineProps({
  icon: {
    type: [Object, Function],
    default: null
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  actionLabel: {
    type: String,
    default: ''
  }
})

defineEmits(['action'])
</script>
