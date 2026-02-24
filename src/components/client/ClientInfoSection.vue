<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Details</h3>

        <div class="space-y-4">
          <div>
            <h4 class="text-sm font-medium text-[var(--text-secondary)]">Website</h4>
            <p class="text-[var(--text-primary)]">
              <a
                v-if="website"
                :href="website"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[var(--accent-primary)] hover:underline"
              >
                {{ website }}
              </a>
              <span v-else class="text-[var(--text-secondary)]">Not specified</span>
            </p>
          </div>

          <div>
            <h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
            <p class="text-[var(--text-primary)] whitespace-pre-line">
              {{ description || 'No description available' }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Client Overview</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-[var(--surface)] p-4">
            <h4 class="text-sm font-medium text-[var(--text-secondary)] mb-1">Projects</h4>
            <p class="text-2xl font-bold text-[var(--text-primary)]">{{ projectCount }}</p>
          </div>

          <div class="bg-[var(--surface)] p-4">
            <h4 class="text-sm font-medium text-[var(--text-secondary)] mb-1">Active Projects</h4>
            <p class="text-2xl font-bold text-[var(--accent-primary)]">
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
