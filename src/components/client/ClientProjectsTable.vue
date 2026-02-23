<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-semibold text-gray-800 dark:text-white">Projects</h3>
      <div class="flex gap-2">
        <div class="relative">
          <input
            type="text"
            :value="search"
            @input="$emit('update:search', $event.target.value)"
            placeholder="Search projects..."
            class="input"
          />
          <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
          </span>
        </div>

        <select
          :value="statusFilter"
          @change="$emit('update:statusFilter', $event.target.value)"
          class="input"
        >
          <option value="">All Statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>

    <div v-if="projects.length === 0" class="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <p class="text-gray-500 dark:text-gray-400">No projects found</p>
      <router-link :to="`/clients/${clientId}/projects/new`" class="btn btn-primary mt-4">
        Create Your First Project
      </router-link>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Project Name
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Start Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              End Date
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="project in projects" :key="project.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="px-6 py-4">
              <router-link :to="`/projects/${project.id}`" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                {{ project.name || project.title || 'Untitled Project' }}
              </router-link>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ project.description }}</p>
            </td>
            <td class="px-6 py-4">
              <span :class="`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`">
                {{ project.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {{ formatDate(project.startDate) }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {{ formatDate(project.endDate) }}
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
              <div class="flex justify-end gap-2">
                <router-link :to="`/projects/${project.id}`" class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                  View
                </router-link>
                <button @click="$emit('edit', project)" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                  Edit
                </button>
                <button @click="$emit('delete', project)" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { getStatusColor } from '@/utils/statusColors'

defineProps({
  projects: {
    type: Array,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  search: {
    type: String,
    default: ''
  },
  statusFilter: {
    type: String,
    default: ''
  }
})

defineEmits(['edit', 'delete', 'update:search', 'update:statusFilter'])

function formatDate(dateString) {
  if (!dateString) return 'Not set'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}
</script>
