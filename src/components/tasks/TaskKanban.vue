<template>
  <div class="kanban-board flex gap-4 overflow-x-auto pb-4">
    <div
      v-for="column in columns"
      :key="column.status"
      class="kanban-column flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex flex-col max-h-[calc(100vh-16rem)]"
      @dragover.prevent
      @dragenter.prevent="onDragEnter($event, column.status)"
      @dragleave="onDragLeave($event, column.status)"
      @drop="onDrop($event, column.status)"
    >
      <!-- Column Header -->
      <div class="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-sm text-gray-700 dark:text-gray-200">{{ column.label }}</span>
          <span class="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5">
            {{ getTasksForStatus(column.status).length }}
          </span>
        </div>
      </div>

      <!-- Column Body (scrollable) -->
      <div
        class="flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150"
        :class="{ 'bg-blue-50 dark:bg-blue-900/20': dragOverColumn === column.status }"
      >
        <div
          v-for="task in getTasksForStatus(column.status)"
          :key="task.id"
          draggable="true"
          @dragstart="onDragStart($event, task)"
          @dragend="onDragEnd"
          @click="emit('edit', task)"
          class="kanban-card bg-white dark:bg-gray-800 shadow rounded-lg p-3 cursor-pointer hover:shadow-md hover:ring-1 hover:ring-primary-400 dark:hover:ring-primary-500 transition-all duration-150 select-none"
          :class="{ 'opacity-50': draggingTaskId === task.id }"
        >
          <!-- Card Title -->
          <div class="font-medium text-sm text-gray-900 dark:text-gray-100 mb-2 leading-snug">
            {{ task.title }}
          </div>

          <!-- Card Meta -->
          <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <!-- Priority Badge -->
            <span v-if="task.priority" class="flex items-center gap-1">
              <span class="inline-block w-2 h-2 rounded-full" :class="priorityColorClass(task.priority)"></span>
              <span class="capitalize">{{ task.priority }}</span>
            </span>

            <!-- Due Date -->
            <span v-if="task.dueDate" class="flex items-center gap-1" :class="isOverdue(task.dueDate) ? 'text-red-500 dark:text-red-400' : ''">
              <CalendarIcon class="h-3.5 w-3.5" />
              {{ formatDate(task.dueDate) }}
            </span>
          </div>

          <!-- Bottom row: project name + assignee -->
          <div class="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span v-if="getProjectName(task.projectId)" class="truncate max-w-[8rem]">
              {{ getProjectName(task.projectId) }}
            </span>
            <span v-else></span>

            <span v-if="task.assigneeName" class="truncate max-w-[6rem] text-right">
              {{ task.assigneeName }}
            </span>
          </div>

          <!-- Actions (stop propagation so clicking delete doesn't trigger edit) -->
          <div class="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              @click.stop="emit('delete', task)"
              class="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Delete task"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Empty column placeholder -->
        <div
          v-if="getTasksForStatus(column.status).length === 0"
          class="text-center py-8 text-xs text-gray-400 dark:text-gray-500"
        >
          No tasks
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { CalendarIcon, TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  },
  projects: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['updateStatus', 'edit', 'delete']);

// Column definitions
const columns = [
  { status: 'To Do', label: 'To Do' },
  { status: 'In Progress', label: 'In Progress' },
  { status: 'Blocked', label: 'Blocked' },
  { status: 'Done', label: 'Done' }
];

// Drag state
const draggingTaskId = ref(null);
const dragOverColumn = ref(null);

// Computed: group tasks by status
const tasksByStatus = computed(() => {
  const grouped = {};
  for (const col of columns) {
    grouped[col.status] = [];
  }
  for (const task of props.tasks) {
    const status = task.status || 'To Do';
    if (grouped[status]) {
      grouped[status].push(task);
    } else {
      // Tasks with unrecognized statuses go into To Do
      grouped['To Do'].push(task);
    }
  }
  return grouped;
});

const getTasksForStatus = (status) => {
  return tasksByStatus.value[status] || [];
};

// Project name lookup
const getProjectName = (projectId) => {
  if (!projectId) return null;
  const project = props.projects.find(p => p.id === projectId);
  return project ? project.title : null;
};

// Priority color classes
const priorityColorClass = (priority) => {
  const map = {
    low: 'bg-gray-400',
    medium: 'bg-blue-500',
    high: 'bg-yellow-500',
    urgent: 'bg-red-500'
  };
  return map[priority?.toLowerCase()] || 'bg-gray-400';
};

// Date formatting
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return '';
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
  } catch {
    return false;
  }
};

// Drag and drop handlers
const onDragStart = (event, task) => {
  draggingTaskId.value = task.id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', task.id);
};

const onDragEnd = () => {
  draggingTaskId.value = null;
  dragOverColumn.value = null;
};

const onDragEnter = (event, status) => {
  dragOverColumn.value = status;
};

const onDragLeave = (event, status) => {
  // Only clear if we're actually leaving the column (not entering a child)
  const relatedTarget = event.relatedTarget;
  if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
    return;
  }
  if (dragOverColumn.value === status) {
    dragOverColumn.value = null;
  }
};

const onDrop = (event, newStatus) => {
  dragOverColumn.value = null;
  const taskId = event.dataTransfer.getData('text/plain');
  if (!taskId) return;

  // Find the task to check its current status
  const task = props.tasks.find(t => t.id === taskId);
  if (!task || task.status === newStatus) return;

  emit('updateStatus', { taskId, status: newStatus });
};
</script>

<style scoped>
.kanban-board {
  min-height: 400px;
}

.kanban-column {
  min-height: 200px;
}

/* Custom scrollbar for columns */
.kanban-column .overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.kanban-column .overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-column .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 2px;
}

.kanban-column .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.6);
}
</style>
