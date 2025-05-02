<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
          <th class="p-3 border-b dark:border-gray-600">Title</th>
          <th class="p-3 border-b dark:border-gray-600">Type</th>
          <th class="p-3 border-b dark:border-gray-600">Status</th>
          <th class="p-3 border-b dark:border-gray-600">Due Date</th>
          <th class="p-3 border-b dark:border-gray-600">Project</th>
          <th class="p-3 border-b dark:border-gray-600">Checklist</th>
          <th class="p-3 border-b dark:border-gray-600 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="task in tasks" 
          :key="task.id" 
          class="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
        >
          <td class="p-3">
            <div class="font-medium text-gray-900 dark:text-gray-100">{{ task.title }}</div>
            <div class="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{{ task.description }}</div>
          </td>
          <td class="p-3">
            <span class="px-2 py-1 text-xs rounded" :class="getTypeClass(task.type)">
              {{ task.type || 'N/A' }}
            </span>
          </td>
          <td class="p-3">
            <select 
              :value="task.status" 
              class="form-select text-sm py-1 px-2" 
              @change="updateStatus(task, $event.target.value)"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </td>
          <td class="p-3 text-sm" :class="isOverdue(task.dueDate) ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'">
            {{ formatDate(task.dueDate) }}
          </td>
          <td class="p-3 text-sm text-gray-600 dark:text-gray-400">{{ getProjectName(task.projectId) }}</td>
          <td class="p-3">
            <div class="flex items-center">
              <span class="text-sm mr-2 text-gray-600 dark:text-gray-400">
                {{ getCompletedCount(task) }}/{{ task.checklist ? task.checklist.length : 0 }}
              </span>
              <button 
                @click="emit('openChecklist', task)" 
                class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                title="View Checklist"
              >
                <ClipboardDocumentCheckIcon class="h-5 w-5" />
              </button>
            </div>
          </td>
          <td class="p-3 text-right">
            <button 
              @click="emit('edit', task)" 
              class="btn-icon mr-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
              title="Edit task"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button 
              @click="emit('delete', task)" 
              class="btn-icon text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500"
              title="Delete task"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useProjectStore } from '../../stores/project';
import { 
  PencilIcon, 
  TrashIcon, 
  ClipboardDocumentCheckIcon 
} from '@heroicons/vue/24/outline';

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['edit', 'delete', 'updateStatus', 'openChecklist']);

const projectStore = useProjectStore();
const projects = computed(() => projectStore.projects);

const getProjectName = (projectId) => {
  const project = projects.value.find(p => p.id === projectId);
  return project ? project.title : '-';
};

const getTypeClass = (type) => {
  const classes = {
    'Design': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Development': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Documentation': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Community': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Meeting': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'Other': 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  };
  return classes[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) return '-'; 
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return '-'; // Return placeholder on error
  }
};

const isOverdue = (dateString) => {
  if (!dateString) return false;
  try {
    const dueDate = new Date(dateString);
    if (isNaN(dueDate.getTime())) return false; 
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  } catch (e) {
    return false;
  }
};

const getCompletedCount = (task) => {
  if (!task.checklist) return 0;
  return task.checklist.filter(item => item.completed).length;
};

const updateStatus = (task, newStatus) => {
  // Emit an event with the task ID and the new status
  emit('updateStatus', { taskId: task.id, status: newStatus });
};
</script>

<style scoped>
/* Add specific styles for the table if needed */
thead th {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style> 