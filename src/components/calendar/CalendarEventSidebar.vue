<template>
  <div class="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
    <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-6">Event Details</h3>

    <div v-if="!selectedEvent" class="text-center text-gray-700 dark:text-gray-300 py-8">
      Select an event to view details
    </div>

    <div v-else class="space-y-6">
      <!-- Event Type and Title -->
      <div>
        <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">
          {{ selectedEvent.type === 'task' ? 'Task' : selectedEvent.type === 'project' ? 'Project' : 'Event' }}
        </h4>
        <p class="text-lg font-medium text-gray-900 dark:text-white">
          {{ selectedEvent.title || getEventTitle(selectedEvent) }}
        </p>
        <p v-if="selectedEvent.description" class="text-sm text-gray-700 dark:text-gray-300 mt-2">
          {{ selectedEvent.description }}
        </p>
      </div>

      <!-- Date Information -->
      <div v-if="selectedEvent.start">
        <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Date</h4>
        <p class="text-sm text-gray-900 dark:text-white">
          {{ formatDate(selectedEvent.start) }}
          <span v-if="selectedEvent.end && selectedEvent.end !== selectedEvent.start">
            - {{ formatDate(selectedEvent.end) }}
          </span>
        </p>
      </div>

      <!-- Project Information (if available) -->
      <div v-if="selectedEvent.projectId">
        <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Related Project</h4>
        <p class="text-sm text-gray-900 dark:text-white">
          {{ projectName }}
        </p>
      </div>

      <!-- Associated Links -->
      <div v-if="projectLinks.length > 0">
        <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Associated Links</h4>
        <div class="space-y-2">
          <div v-for="(link, index) in projectLinks" :key="index" class="flex items-center">
            <svg class="h-4 w-4 text-gray-700 dark:text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <a href="#" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">{{ link }}</a>
          </div>
        </div>
      </div>

      <!-- Contacts -->
      <div v-if="projectContacts.length > 0">
        <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Contacts</h4>
        <div class="space-y-3">
          <div v-for="contact in projectContacts" :key="contact.id" class="flex items-center">
            <div class="w-8 h-8 rounded-full overflow-hidden mr-3">
              <img :src="contact.avatar" :alt="contact.name" class="w-full h-full object-cover" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ contact.name }}</div>
              <div class="text-xs text-gray-700 dark:text-gray-300">{{ contact.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pt-4">
        <button
          @click="$emit('navigate-to-event', selectedEvent)"
          class="btn btn-primary btn-sm w-full"
        >
          View {{ selectedEvent.type === 'task' ? 'Task' : selectedEvent.type === 'project' ? 'Project' : 'Event' }} Details
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CalendarEvent {
  id: string;
  color: string;
  type?: string;
  projectId?: string;
  title?: string;
  description?: string;
  start?: string | Date;
  end?: string | Date;
  taskId?: string;
  campaignId?: string;
  [key: string]: any;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

defineProps<{
  selectedEvent: CalendarEvent | null;
  projectName: string;
  projectLinks: string[];
  projectContacts: Contact[];
  getEventTitle: (event: CalendarEvent) => string;
  formatDate: (date: string | Date) => string;
}>();

defineEmits<{
  (e: 'navigate-to-event', event: CalendarEvent): void;
}>();
</script>
