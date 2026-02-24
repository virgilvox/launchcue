<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Steps</h3>

    <nav class="space-y-0">
      <div v-for="(step, index) in steps" :key="step.id || index" class="relative">
        <!-- Connecting line (between circles, not after last) -->
        <div
          v-if="index < steps.length - 1"
          class="absolute left-4 top-8 w-0.5 h-full -ml-px"
          :class="step.completedAt ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'"
        ></div>

        <!-- Step row -->
        <button
          @click="$emit('select', index)"
          class="relative flex items-start gap-3 w-full text-left py-3 px-2 rounded-md transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
          :class="index === currentIndex ? 'bg-[var(--accent-primary-wash)]' : ''"
        >
          <!-- Circle indicator -->
          <div class="flex-shrink-0 relative z-10">
            <!-- Completed: green check -->
            <div
              v-if="step.completedAt"
              class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>

            <!-- Current: indigo filled -->
            <div
              v-else-if="index === currentIndex"
              class="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center"
            >
              <span class="text-xs font-bold text-white">{{ index + 1 }}</span>
            </div>

            <!-- Pending: gray outline -->
            <div
              v-else
              class="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-800"
            >
              <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ index + 1 }}</span>
            </div>
          </div>

          <!-- Step info -->
          <div class="min-w-0 pt-1">
            <p
              class="text-sm font-medium truncate"
              :class="[
                step.completedAt
                  ? 'text-green-700 dark:text-green-400'
                  : index === currentIndex
                    ? 'text-[var(--accent-primary)]'
                    : 'text-gray-700 dark:text-gray-300'
              ]"
            >
              {{ step.title }}
            </p>
            <span
              class="inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium"
              :class="getTypeBadgeClass(step.type)"
            >
              {{ step.type }}
            </span>
          </div>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup>
defineProps({
  steps: {
    type: Array,
    required: true,
  },
  currentIndex: {
    type: Number,
    required: true,
  },
})

defineEmits(['select'])

function getTypeBadgeClass(type) {
  switch (type) {
    case 'info':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'form':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
    case 'upload':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    case 'approval':
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}
</script>
