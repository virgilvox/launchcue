<template>
  <div class="filter-bar mb-4 flex flex-wrap gap-3 items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm">
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex items-center gap-2">
        <label for="status-filter" class="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
        <select
          id="status-filter"
          :value="modelValue.status"
          @input="updateFilter('status', $event.target.value)"
          class="form-select text-sm py-1 px-2 rounded"
        >
          <option value="">All</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label for="type-filter" class="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
        <select
          id="type-filter"
          :value="modelValue.type"
          @input="updateFilter('type', $event.target.value)"
          class="form-select text-sm py-1 px-2 rounded"
        >
          <option value="">All</option>
          <option value="Design">Design</option>
          <option value="Development">Development</option>
          <option value="Documentation">Documentation</option>
          <option value="Community">Community</option>
          <option value="Meeting">Meeting</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label for="client-filter" class="text-sm font-medium text-gray-700 dark:text-gray-300">Client:</label>
        <select
          id="client-filter"
          :value="modelValue.clientId"
          @input="updateFilter('clientId', $event.target.value || null)" 
          class="form-select text-sm py-1 px-2 rounded"
        >
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.name }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label for="project-filter" class="text-sm font-medium text-gray-700 dark:text-gray-300">Project:</label>
        <select
          id="project-filter"
          :value="modelValue.projectId"
          @input="updateFilter('projectId', $event.target.value || null)" 
          class="form-select text-sm py-1 px-2 rounded"
        >
          <option value="">All Projects</option>
          <option v-for="project in filteredProjectsForClient" :key="project.id" :value="project.id">
              {{ project.title }}
          </option>
        </select>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <label for="sort-by" class="text-sm font-medium text-gray-700 dark:text-gray-300">Sort By:</label>
      <select
        id="sort-by"
        :value="modelValue.sortBy"
        @input="updateFilter('sortBy', $event.target.value)"
        class="form-select text-sm py-1 px-2 rounded"
      >
        <option value="dueDate">Due Date</option>
        <option value="createdAt">Created Date</option>
        <option value="title">Title</option>
        <option value="status">Status</option>
        <option value="type">Type</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useProjectStore } from '../../stores/project';
import { useClientStore } from '../../stores/client';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({ 
        status: '', 
        type: '', 
        clientId: null,
        projectId: null, 
        sortBy: 'dueDate' 
    })
  }
});

const emit = defineEmits(['update:modelValue']);

const projectStore = useProjectStore();
const clientStore = useClientStore();

const projects = computed(() => projectStore.projects);
const clients = computed(() => clientStore.clients);

const filteredProjectsForClient = computed(() => {
    if (!props.modelValue.clientId) {
        return projects.value;
    }
    return projects.value.filter(p => p.clientId === props.modelValue.clientId);
});

const updateFilter = (key, value) => {
  const newFilters = { ...props.modelValue, [key]: value };
  if (key === 'clientId') {
      newFilters.projectId = null;
  }
  emit('update:modelValue', newFilters);
};

// Fetch clients if not already loaded (can be done in parent Tasks.vue as well)
// onMounted(() => {
//   if (clients.value.length === 0) {
//     clientStore.fetchClients();
//   }
// });
</script>

<style scoped>
/* Add specific styles if needed */
</style> 