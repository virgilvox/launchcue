<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="flex items-center space-x-1 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center">
        <ChevronRightIcon
          v-if="index > 0"
          class="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500 mx-1"
        />
        <router-link
          v-if="item.to"
          :to="item.to"
          class="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          {{ item.label }}
        </router-link>
        <span
          v-else
          class="text-gray-700 dark:text-gray-300 font-medium"
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

defineProps({
  items: {
    type: Array,
    required: true,
    validator: (value) =>
      value.every(
        (item) => typeof item.label === 'string' && (item.to === undefined || typeof item.to === 'string')
      )
  }
})
</script>
