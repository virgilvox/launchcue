<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Contacts</h3>
      <button @click="$emit('add')" class="btn btn-primary btn-sm">
        Add Contact
      </button>
    </div>

    <div v-if="loading" class="text-center py-4">
      <LoadingSpinner size="small" text="Loading contacts..." />
    </div>

    <div v-else-if="contacts.length === 0" class="text-center py-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">No contacts added yet.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="contact in contacts"
        :key="contact.id"
        class="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 group"
      >
        <div class="flex items-center">
          <!-- Placeholder Avatar -->
          <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-3 flex-shrink-0">
            <span class="text-lg font-medium">{{ getInitials(contact.name) }}</span>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ contact.name }}
              <span v-if="contact.isPrimary" class="text-xs font-bold text-primary-600 dark:text-primary-400">(Primary)</span>
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ contact.role || 'No role specified' }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ contact.email || 'No email' }}
              {{ contact.email && contact.phone ? '\u2022' : '' }}
              {{ contact.phone || '' }}
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            @click="$emit('edit', contact)"
            class="btn-icon text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            title="Edit Contact"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button
            @click="$emit('delete', contact)"
            class="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-500"
            title="Delete Contact"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getInitials } from '@/utils/formatters'

defineProps({
  contacts: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['add', 'edit', 'delete'])
</script>
