<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-5">
    <h3 class="heading-section mb-4">Summary</h3>

    <div class="space-y-4">
      <!-- Total deliverables -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-[var(--text-secondary)]">Deliverables</span>
        <span class="text-sm font-semibold text-[var(--text-primary)]">
          {{ totalDeliverables }}
        </span>
      </div>

      <!-- Total estimated hours -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-[var(--text-secondary)]">Estimated Hours</span>
        <span class="text-sm font-semibold text-[var(--text-primary)]">
          {{ totalHours.toFixed(1) }}h
        </span>
      </div>

      <!-- Total amount -->
      <div class="flex justify-between items-center pt-2 border-t border-[var(--border-light)]">
        <span class="text-sm font-medium text-[var(--text-primary)]">Total Amount</span>
        <span class="text-lg font-bold text-[var(--text-primary)]">
          {{ formatCurrency(totalAmount) }}
        </span>
      </div>

      <!-- Status badge (project scopes only) -->
      <div v-if="!isTemplate" class="flex justify-between items-center">
        <span class="text-sm text-[var(--text-secondary)]">Status</span>
        <span :class="['badge', statusColorClass]">
          {{ status || 'draft' }}
        </span>
      </div>

      <!-- Progress bar (project scopes with deliverable statuses) -->
      <div v-if="!isTemplate && deliverablesWithStatus > 0" class="pt-2 border-t border-[var(--border-light)]">
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-sm text-[var(--text-secondary)]">Progress</span>
          <span class="text-xs text-[var(--text-secondary)]">
            {{ completedCount }} / {{ totalDeliverables }} complete
          </span>
        </div>
        <div class="w-full bg-[var(--surface)] rounded-full h-2.5">
          <div
            class="bg-[var(--accent-primary)] h-2.5 rounded-full transition-all duration-300"
            :style="`width: ${progressPercentage}%`"
          ></div>
        </div>
        <div class="text-right mt-1">
          <span class="text-xs text-[var(--text-secondary)]">
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
