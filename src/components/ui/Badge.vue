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
    validator: (v) => ['blue', 'green', 'yellow', 'red', 'purple', 'gray', 'primary', 'coral'].includes(v)
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
    primary: 'badge-coral',
    coral: 'badge-coral',
  }
  return map[props.variant] || map.gray
})
</script>
