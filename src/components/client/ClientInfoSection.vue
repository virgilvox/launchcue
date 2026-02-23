<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Details</h3>

        <div class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Website</h4>
            <p class="text-gray-800 dark:text-white">
              <a
                v-if="website"
                :href="website"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {{ website }}
              </a>
              <span v-else class="text-gray-500 dark:text-gray-400">Not specified</span>
            </p>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h4>
            <p class="text-gray-800 dark:text-white whitespace-pre-line">
              {{ description || 'No description available' }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Client Overview</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Projects</h4>
            <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ projectCount }}</p>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Projects</h4>
            <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {{ activeProjectCount }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  website: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  projectCount: {
    type: Number,
    default: 0
  },
  activeProjectCount: {
    type: Number,
    default: 0
  }
})
</script>
