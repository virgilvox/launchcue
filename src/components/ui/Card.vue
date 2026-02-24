<template>
  <div :class="['card', { 'card-interactive': interactive, 'card-featured': featured }, className]">
    <div v-if="title || $slots.header" class="flex items-center justify-between mb-4">
      <div>
        <h3 v-if="title" class="heading-card">{{ title }}</h3>
        <p v-if="subtitle" class="text-caption mt-0.5">{{ subtitle }}</p>
      </div>
      <slot name="header"></slot>
    </div>
    <slot></slot>
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-[var(--border-light)]">
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
  interactive: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  className: {
    type: String,
    default: ''
  }
})
</script>
