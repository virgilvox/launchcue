<template>
  <span :class="['badge', badgeColorClass]">
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (v) => ['draft', 'sent', 'viewed', 'paid', 'overdue'].includes(v),
  },
})

const label = computed(() => {
  if (!props.status) return ''
  return props.status.charAt(0).toUpperCase() + props.status.slice(1)
})

const badgeColorClass = computed(() => {
  const colorMap = {
    draft: '',
    sent: 'badge-blue',
    viewed: 'badge-yellow',
    paid: 'badge-green',
    overdue: 'badge-red',
  }

  return colorMap[props.status] || ''
})
</script>
