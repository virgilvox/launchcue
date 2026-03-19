<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div class="w-14 h-14 border-2 border-[var(--border)] bg-[var(--surface)] flex items-center justify-center mb-4">
      <component :is="icon" v-if="icon" class="h-7 w-7 text-[var(--text-secondary)]" />
    </div>
    <h3 class="heading-card mb-1">{{ title }}</h3>
    <p v-if="description" class="text-body max-w-md mb-6">{{ description }}</p>
    <slot name="action">
      <button
        v-if="actionLabel"
        class="btn btn-primary"
        @click="$emit('action')"
      >
        <PlusIcon class="h-4 w-4 mr-2" />
        {{ actionLabel }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'

interface Props {
  icon?: Component | null
  title: string
  description?: string
  actionLabel?: string
}

withDefaults(defineProps<Props>(), {
  icon: null,
  description: '',
  actionLabel: '',
})

defineEmits<{
  (e: 'action'): void
}>()
</script>
