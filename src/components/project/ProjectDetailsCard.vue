<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
    <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Project Details</h3>

    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
        <p class="text-[var(--text-primary)] whitespace-pre-line">
          {{ project.description || 'No description available' }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 class="text-sm font-medium text-[var(--text-secondary)]">Start Date</h4>
          <p class="text-[var(--text-primary)]">
            {{ formatDate(project.startDate) || 'Not set' }}
          </p>
        </div>

        <div>
          <h4 class="text-sm font-medium text-[var(--text-secondary)]">
            {{ project.dueDate ? 'Deadline' : 'End Date' }}
          </h4>
          <p
            class="text-[var(--text-primary)]"
            :class="{ 'text-[var(--danger)]': deadlineNear }"
          >
            {{ formatDate(project.dueDate || project.endDate) || 'Not set' }}
          </p>
        </div>
      </div>

      <div v-if="project.tags && project.tags.length > 0">
        <h4 class="text-sm font-medium text-[var(--text-secondary)] mb-2">Tags</h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="tag in project.tags"
            :key="tag"
            class="bg-[var(--surface)] text-[var(--text-primary)] px-3 py-1 text-sm"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDate } from '@/utils/dateFormatter'

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

</script>
