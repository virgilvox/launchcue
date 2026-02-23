<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Project Stats</h3>

    <div class="space-y-6">
      <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Task Completion</h4>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            class="bg-primary-600 h-2.5 rounded-full"
            :style="`width: ${completionPercentage}%`"
          ></div>
        </div>
        <div class="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{{ completionPercentage }}% complete</span>
          <span>{{ completedCount }} / {{ totalCount }} tasks</span>
        </div>
      </div>

      <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</h4>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs text-gray-500 dark:text-gray-400">Start</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">End</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 relative">
            <div
              class="bg-primary-600 h-2.5 rounded-full"
              :style="`width: ${timelinePercentage}%`"
            ></div>
            <div
              class="absolute w-3 h-3 bg-red-500 rounded-full -top-0.5"
              :style="`left: calc(${currentTimelinePercentage}% - 6px)`"
            ></div>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-800 dark:text-white">{{ formatDateShort(startDate) }}</span>
            <span class="text-gray-800 dark:text-white">{{ formatDateShort(endDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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

function formatDateShort(dateString) {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}
</script>
