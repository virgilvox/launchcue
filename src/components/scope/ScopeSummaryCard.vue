<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
    <h3 class="heading-section mb-4">Summary</h3>

    <div class="space-y-4">
      <!-- Total deliverables -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-300">Deliverables</span>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ totalDeliverables }}
        </span>
      </div>

      <!-- Total estimated hours -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-300">Estimated Hours</span>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ totalHours.toFixed(1) }}h
        </span>
      </div>

      <!-- Total amount -->
      <div class="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">Total Amount</span>
        <span class="text-lg font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(totalAmount) }}
        </span>
      </div>

      <!-- Status badge (project scopes only) -->
      <div v-if="!isTemplate" class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-300">Status</span>
        <span :class="['badge', statusColorClass]">
          {{ status || 'draft' }}
        </span>
      </div>

      <!-- Progress bar (project scopes with deliverable statuses) -->
      <div v-if="!isTemplate && deliverablesWithStatus > 0" class="pt-2 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-sm text-gray-600 dark:text-gray-300">Progress</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ completedCount }} / {{ totalDeliverables }} complete
          </span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            class="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
            :style="`width: ${progressPercentage}%`"
          ></div>
        </div>
        <div class="text-right mt-1">
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ progressPercentage }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import { getStatusColor } from '@/utils/statusColors'

const props = defineProps({
  deliverables: {
    type: Array,
    default: () => [],
  },
  status: {
    type: String,
    default: 'draft',
  },
  isTemplate: {
    type: Boolean,
    default: false,
  },
})

const totalDeliverables = computed(() => props.deliverables.length)

const totalHours = computed(() => {
  return props.deliverables.reduce((sum, d) => sum + (d.estimatedHours || 0), 0)
})

const totalAmount = computed(() => {
  return props.deliverables.reduce((sum, d) => {
    return sum + (d.quantity || 0) * (d.rate || 0)
  }, 0)
})

const statusColorClass = computed(() => getStatusColor(props.status))

const deliverablesWithStatus = computed(() => {
  return props.deliverables.filter((d) => d.status).length
})

const completedCount = computed(() => {
  return props.deliverables.filter(
    (d) => d.status === 'completed' || d.status === 'approved'
  ).length
})

const progressPercentage = computed(() => {
  if (totalDeliverables.value === 0) return 0
  return Math.round((completedCount.value / totalDeliverables.value) * 100)
})
</script>
