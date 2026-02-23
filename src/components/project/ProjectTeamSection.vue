<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Team Members</h3>
      <button @click="$emit('add-member')" class="btn btn-primary btn-sm">
        Add
      </button>
    </div>

    <div v-if="!members || members.length === 0" class="text-center py-4">
      <p class="text-gray-500 dark:text-gray-400">No team members assigned</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="member in members"
        :key="member.id"
        class="flex items-center justify-between"
      >
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
            {{ getInitials(member.name) }}
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-800 dark:text-white">{{ member.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.role }}</p>
          </div>
        </div>
        <button @click="$emit('remove-member', member)" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
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
