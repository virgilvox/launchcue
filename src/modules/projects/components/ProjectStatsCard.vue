<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
    <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Project Stats</h3>

    <div class="space-y-6">
      <div>
        <h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Task Completion</h4>
        <div class="w-full bg-[var(--surface)] rounded-full h-2.5">
          <div
            class="bg-[var(--accent-primary)] h-2.5 rounded-full"
            :style="`width: ${completionPercentage}%`"
          ></div>
        </div>
        <div class="flex justify-between mt-1 text-xs text-[var(--text-secondary)]">
          <span>{{ completionPercentage }}% complete</span>
          <span>{{ completedCount }} / {{ totalCount }} tasks</span>
        </div>
      </div>

      <div>
        <h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Timeline</h4>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs text-[var(--text-secondary)]">Start</span>
            <span class="text-xs text-[var(--text-secondary)]">End</span>
          </div>
          <div class="w-full bg-[var(--surface)] rounded-full h-2.5 relative">
            <div
              class="bg-[var(--accent-primary)] h-2.5 rounded-full"
              :style="`width: ${timelinePercentage}%`"
            ></div>
            <div
              class="absolute w-3 h-3 bg-[var(--danger)] rounded-full -top-0.5"
              :style="`left: calc(${currentTimelinePercentage}% - 6px)`"
            ></div>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-[var(--text-primary)]">{{ formatShortDate(startDate) || 'Not set' }}</span>
            <span class="text-[var(--text-primary)]">{{ formatShortDate(endDate) || 'Not set' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatShortDate } from '@/utils/dateFormatter'

defineProps({
  completionPercentage: {
    type: Number,
    default: 0,
  },
  completedCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
  timelinePercentage: {
    type: Number,
    default: 0,
  },
  currentTimelinePercentage: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: String,
    default: null,
  },
  endDate: {
    type: String,
    default: null,
  },
})

</script>
