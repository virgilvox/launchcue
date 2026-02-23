<template>
  <div class="w-80">
    <!-- Attachments -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mb-6">
      <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Attachments</h3>

      <div class="space-y-3">
        <div v-for="(attachment, index) in attachments" :key="index" class="flex items-center">
          <svg class="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <a href="#" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">{{ attachment }}</a>
        </div>

        <!-- Add Attachment Button -->
        <div class="flex items-center text-primary-600 dark:text-primary-400 cursor-pointer mt-2">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span class="text-sm">Add</span>
        </div>
      </div>
    </div>

    <!-- Team -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
      <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Team</h3>

      <div class="flex justify-between items-center mb-4">
        <!-- Team members avatars -->
        <div class="flex -space-x-2">
          <div v-for="member in teamMembers" :key="member.id" class="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-800">
            <div v-if="member.avatar" class="w-full h-full">
              <img :src="member.avatar" :alt="member.name"
                   class="w-full h-full object-cover"
                   @error="onImageError($event, member)" />
            </div>
            <div v-else class="w-full h-full bg-primary-500 text-white flex items-center justify-center">
              {{ getInitials(member.name) }}
            </div>
          </div>
        </div>

        <!-- Member names in a simplified format -->
        <div class="flex flex-col items-end">
          <div v-for="member in teamMembers" :key="member.id" class="text-sm text-gray-700 dark:text-gray-300">
            {{ member.name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getInitials } from '@/utils/formatters'

interface TeamMember {
  id: string
  userId?: string
  name: string
  email?: string
  avatar: string | null
}

defineProps<{
  attachments: string[]
  teamMembers: TeamMember[]
}>()

const emit = defineEmits<{
  'image-error': [event: Event, member: TeamMember]
}>()

function onImageError(event: Event, member: TeamMember) {
  emit('image-error', event, member)
}
</script>
