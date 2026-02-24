<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-4">
    <h3 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Steps</h3>

    <nav class="space-y-0">
      <div v-for="(step, index) in steps" :key="step.id || index" class="relative">
        <!-- Connecting line (between circles, not after last) -->
        <div
          v-if="index < steps.length - 1"
          class="absolute left-4 top-8 w-0.5 h-full -ml-px"
          :class="step.completedAt ? 'bg-[var(--success)]/30' : 'bg-[var(--border-light)]'"
        ></div>

        <!-- Step row -->
        <button
          @click="$emit('select', index)"
          class="relative flex items-start gap-3 w-full text-left py-3 px-2 transition-colors hover:bg-[var(--surface)]"
          :class="index === currentIndex ? 'bg-[var(--accent-primary-wash)]' : ''"
        >
          <!-- Circle indicator -->
          <div class="flex-shrink-0 relative z-10">
            <!-- Completed: green check -->
            <div
              v-if="step.completedAt"
              class="w-8 h-8 rounded-full bg-[var(--success)] flex items-center justify-center"
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
              class="w-8 h-8 rounded-full border-2 border-[var(--border-light)] flex items-center justify-center bg-[var(--surface-elevated)]"
            >
              <span class="text-xs font-medium text-[var(--text-secondary)]">{{ index + 1 }}</span>
            </div>
          </div>

          <!-- Step info -->
          <div class="min-w-0 pt-1">
            <p
              class="text-sm font-medium truncate"
              :class="[
                step.completedAt
                  ? 'text-[var(--success)]'
                  : index === currentIndex
                    ? 'text-[var(--accent-primary)]'
                    : 'text-[var(--text-primary)]'
              ]"
            >
              {{ step.title }}
            </p>
            <span
              class="inline-block mt-1 text-xs px-1.5 py-0.5 font-medium"
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
      return 'badge badge-blue'
    case 'form':
      return 'badge badge-purple'
    case 'upload':
      return 'badge badge-yellow'
    case 'approval':
      return 'badge badge-green'
    default:
      return 'badge'
  }
}
</script>
