<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-[var(--text-primary)]">Team Members</h3>
      <button @click="$emit('add-member')" class="btn btn-primary btn-sm">
        Add
      </button>
    </div>

    <div v-if="!members || members.length === 0" class="text-center py-4">
      <p class="text-[var(--text-secondary)]">No team members assigned</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex items-center justify-between"
      >
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
            {{ getInitials(member.name) }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-[var(--text-primary)]">{{ member.name }}</p>
            <p class="text-xs text-[var(--text-secondary)]">{{ member.role }}</p>
          </div>
        </div>
        <button @click="$emit('remove-member', member)" class="text-[var(--danger)] hover:opacity-80">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getInitials } from '@/utils/formatters'

defineProps({
  members: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['add-member', 'remove-member'])
</script>
