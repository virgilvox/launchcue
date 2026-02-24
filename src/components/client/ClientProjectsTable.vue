<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-semibold text-[var(--text-primary)]">Projects</h3>
      <div class="flex gap-2">
        <div class="relative">
          <input
            type="text"
            :value="search"
            @input="$emit('update:search', $event.target.value)"
            placeholder="Search projects..."
            class="input"
          />
          <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-secondary)]">
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

    <div v-if="projects.length === 0" class="text-center py-10 bg-[var(--surface-elevated)] border-2 border-[var(--border-light)]">
      <p class="text-[var(--text-secondary)]">No projects found</p>
      <router-link :to="`/clients/${clientId}/projects/new`" class="btn btn-primary mt-4">
        Create Your First Project
      </router-link>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full bg-[var(--surface-elevated)] border-2 border-[var(--border-light)]">
        <thead class="bg-[var(--surface)]">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Project Name
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Start Date
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              End Date
            </th>
            <th class="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-light)]">
          <tr v-for="project in projects" :key="project.id" class="hover:bg-[var(--surface)]">
            <td class="px-6 py-4">
              <router-link :to="`/projects/${project.id}`" class="text-[var(--accent-primary)] hover:underline font-medium">
                {{ project.name || project.title || 'Untitled Project' }}
              </router-link>
              <p class="text-xs text-[var(--text-secondary)] mt-1">{{ project.description }}</p>
            </td>
            <td class="px-6 py-4">
              <span :class="`px-2 py-1 text-xs ${getStatusColor(project.status)}`">
                {{ project.status }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-[var(--text-primary)]">
              {{ formatDate(project.startDate) || 'Not set' }}
            </td>
            <td class="px-6 py-4 text-sm text-[var(--text-primary)]">
              {{ formatDate(project.endDate) || 'Not set' }}
            </td>
            <td class="px-6 py-4 text-right text-sm font-medium">
              <div class="flex justify-end gap-2">
                <router-link :to="`/projects/${project.id}`" class="text-[var(--accent-primary)] hover:opacity-80">
                  View
                </router-link>
                <button @click="$emit('edit', project)" class="text-[var(--accent-primary)] hover:opacity-80">
                  Edit
                </button>
                <button @click="$emit('delete', project)" class="text-[var(--danger)] hover:opacity-80">
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
import { formatDate } from '@/utils/dateFormatter'

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
</script>
