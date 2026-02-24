<template>
  <nav aria-label="Breadcrumb" class="mb-4">
    <ol class="flex items-center space-x-1 text-sm">
      <li v-for="(item, index) in items" :key="index" class="flex items-center">
        <ChevronRightIcon
          v-if="index > 0"
          class="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)] mx-1"
        />
        <router-link
          v-if="item.to"
          :to="item.to"
          class="text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
        >
          {{ item.label }}
        </router-link>
        <span
          v-else
          class="text-[var(--text-primary)] font-medium"
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
