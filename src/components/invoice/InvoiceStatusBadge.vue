<template>
  <span :class="badgeClasses">
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

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center rounded-full text-xs font-medium px-2.5 py-0.5'

  const colorMap = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    viewed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  }

  return `${base} ${colorMap[props.status] || colorMap.draft}`
})
</script>
