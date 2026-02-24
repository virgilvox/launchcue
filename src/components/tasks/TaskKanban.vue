<template>
  <div class="kanban-board flex gap-4 overflow-x-auto pb-4">
    <div
      v-for="column in columns"
      :key="column.status"
      class="kanban-column flex-shrink-0 w-72 border-2 border-[var(--border-light)] bg-[var(--surface)] flex flex-col max-h-[calc(100vh-16rem)]"
      @dragover.prevent
      @dragenter.prevent="onDragEnter($event, column.status)"
      @dragleave="onDragLeave($event, column.status)"
      @drop="onDrop($event, column.status)"
    >
      <!-- Column Header -->
      <div class="flex items-center justify-between px-3 py-3 border-b-2 border-[var(--border-light)]">
        <div class="flex items-center gap-2">
          <span class="overline">{{ column.label }}</span>
          <span class="mono text-body-sm font-bold text-[var(--text-secondary)]">
            {{ getTasksForStatus(column.status).length }}
          </span>
        </div>
      </div>

      <!-- Column Body (scrollable) -->
      <div
        class="flex-1 overflow-y-auto p-2 space-y-2 transition-colors duration-150"
        :class="{ 'bg-[var(--accent-primary-wash)]': dragOverColumn === column.status }"
      >
        <div
          v-for="task in getTasksForStatus(column.status)"
          :key="task.id"
          draggable="true"
          @dragstart="onDragStart($event, task)"
          @dragend="onDragEnd"
          @click="emit('edit', task)"
          class="card card-interactive p-3 cursor-pointer select-none"
          :class="{ 'opacity-50': draggingTaskId === task.id }"
        >
          <!-- Card Title -->
          <div class="font-medium text-body-sm text-[var(--text-primary)] mb-2 leading-snug">
            {{ task.title }}
          </div>

          <!-- Card Meta -->
          <div class="flex flex-wrap items-center gap-2 text-caption">
            <!-- Priority Badge -->
            <span v-if="task.priority" class="flex items-center gap-1">
              <span class="inline-block w-2 h-2" :class="priorityColorClass(task.priority)"></span>
              <span class="capitalize">{{ task.priority }}</span>
            </span>

            <!-- Due Date -->
            <span v-if="task.dueDate" class="flex items-center gap-1 mono" :class="isOverdue(task.dueDate) ? 'text-[var(--danger)]' : ''">
              <CalendarIcon class="h-3.5 w-3.5" />
              {{ formatShortDate(task.dueDate) }}
            </span>
          </div>

          <!-- Bottom row: project name + assignee -->
          <div class="flex items-center justify-between mt-2 text-caption">
            <span v-if="task.projectId" class="truncate max-w-[8rem]">
              {{ getProjectName(task.projectId) }}
            </span>
            <span v-else></span>

            <span v-if="task.assigneeName" class="truncate max-w-[6rem] text-right">
              {{ task.assigneeName }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex justify-end mt-2 pt-2 border-t border-[var(--border-light)]">
            <button
              @click.stop="emit('delete', task)"
              class="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors"
              title="Delete task"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Empty column placeholder -->
        <div
          v-if="getTasksForStatus(column.status).length === 0"
          class="text-center py-8 text-caption"
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
import { formatShortDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';

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

const { getProjectName } = useEntityLookup();

const columns = [
  { status: 'To Do', label: 'TO DO' },
  { status: 'In Progress', label: 'IN PROGRESS' },
  { status: 'Blocked', label: 'BLOCKED' },
  { status: 'Done', label: 'DONE' }
];

const draggingTaskId = ref(null);
const dragOverColumn = ref(null);

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
      grouped['To Do'].push(task);
    }
  }
  return grouped;
});

const getTasksForStatus = (status) => {
  return tasksByStatus.value[status] || [];
};

const priorityColorClass = (priority) => {
  const map = {
    low: 'bg-[var(--text-secondary)]',
    medium: 'bg-[#2563EB]',
    high: 'bg-[var(--warning)]',
    urgent: 'bg-[var(--danger)]'
  };
  return map[priority?.toLowerCase()] || 'bg-[var(--text-secondary)]';
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

.kanban-column .overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.kanban-column .overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.kanban-column .overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: var(--border-light);
}
</style>
