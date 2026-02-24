<template>
  <span
    v-if="variant === 'dot'"
    class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
    :style="{ backgroundColor: hex }"
  />
  <span
    v-else
    class="w-1 self-stretch flex-shrink-0"
    :style="{ backgroundColor: hex }"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getClientColor } from '@/constants/clientColors'

const props = withDefaults(defineProps<{
  color?: string
  variant?: 'dot' | 'stripe'
}>(), {
  variant: 'dot'
})

const hex = computed(() => getClientColor(props.color))
</script>
