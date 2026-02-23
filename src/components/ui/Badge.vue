<template>
  <span :class="['badge', variantClass]">
    <slot></slot>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'gray',
    validator: (v) => ['blue', 'green', 'yellow', 'red', 'purple', 'gray', 'primary'].includes(v)
  }
})

const variantClass = computed(() => {
  const map = {
    blue: 'badge-blue',
    green: 'badge-green',
    yellow: 'badge-yellow',
    red: 'badge-red',
    purple: 'badge-purple',
    gray: 'badge-gray',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  }
  return map[props.variant] || map.gray
})
</script>
