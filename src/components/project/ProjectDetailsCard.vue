<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Project Details</h3>

    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h4>
        <p class="text-gray-800 dark:text-white whitespace-pre-line">
          {{ project.description || 'No description available' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h4>
          <p class="text-gray-800 dark:text-white">
            {{ formatDate(project.startDate) }}
          </p>
        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">
            {{ project.dueDate ? 'Deadline' : 'End Date' }}
          </h4>
          <p
            class="text-gray-800 dark:text-white"
            :class="{ 'text-red-600 dark:text-red-400': deadlineNear }"
          >
            {{ formatDate(project.dueDate || project.endDate) }}
          </p>
        </div>
      </div>

      <div v-if="project.tags && project.tags.length > 0">
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tag in project.tags"
            :key="tag"
            class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  project: {
    type: Object,
    required: true,
  },
  deadlineNear: {
    type: Boolean,
    default: false,
  },
})

function formatDate(dateString) {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
</script>
