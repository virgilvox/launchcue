<template>
  <div class="overflow-x-auto -mx-4 sm:mx-0">
    <table class="w-full min-w-[800px]">
      <thead>
        <tr>
          <th>TASK</th>
          <th>PRIORITY</th>
          <th>STATUS</th>
          <th>ASSIGNEE</th>
          <th>DUE DATE</th>
          <th>PROJECT</th>
          <th class="text-center">CHECKLIST</th>
          <th class="text-right">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="task in tasks"
          :key="task.id"
          class="hover:bg-[var(--surface)] transition-colors cursor-pointer"
        >
          <td>
            <div class="font-medium text-[var(--text-primary)]">{{ task.title }}</div>
            <div v-if="task.type" class="mt-0.5">
              <span :class="['badge', getTypeClass(task.type)]">{{ task.type }}</span>
            </div>
          </td>
          <td>
            <span :class="['badge', getPriorityClass(task.priority)]">
              {{ task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium' }}
            </span>
          </td>
          <td>
            <select
              :value="task.status"
              class="input text-body-sm py-1 px-2 min-w-[120px]"
              @change="updateStatus(task, $event.target.value)"
              @click.stop
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
          </td>
          <td>
            <div v-if="task.assigneeId" class="flex items-center gap-2">
              <span class="inline-flex items-center justify-center h-6 w-6 bg-[var(--accent-primary)] text-white text-[10px] font-bold">
                {{ getAssigneeInitials(task.assigneeId) }}
              </span>
              <span class="text-body-sm">{{ getAssigneeName(task.assigneeId) }}</span>
            </div>
            <span v-else class="text-caption">Unassigned</span>
          </td>
          <td :class="isOverdue(task.dueDate) ? 'text-[var(--danger)] font-medium' : ''">
            <span class="mono text-body-sm">{{ formatDate(task.dueDate) || '-' }}</span>
          </td>
          <td class="text-body-sm text-[var(--text-secondary)]">{{ getProjectName(task.projectId) }}</td>
          <td class="text-center">
            <button
              @click.stop="emit('openChecklist', task)"
              class="inline-flex items-center gap-1 text-body-sm text-[var(--accent-primary)] hover:underline"
              title="View Checklist"
            >
              <span class="mono font-bold">{{ getCompletedCount(task) }}/{{ task.checklist ? task.checklist.length : 0 }}</span>
              <ClipboardDocumentCheckIcon class="h-4 w-4" />
            </button>
          </td>
          <td class="text-right">
            <div class="flex items-center justify-end gap-1">
              <button
                @click.stop="emit('edit', task)"
                class="btn-icon text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                title="Edit task"
              >
                <PencilIcon class="h-4 w-4" />
              </button>
              <button
                @click.stop="emit('delete', task)"
                class="btn-icon text-[var(--text-secondary)] hover:text-[var(--danger)]"
                title="Delete task"
              >
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTeamStore } from '../../stores/team';
import { formatDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';
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

const { getProjectName } = useEntityLookup();
const teamStore = useTeamStore();
const teamMembers = computed(() => teamStore.validTeamMembers);

const getPriorityClass = (priority) => {
  const classes = {
    'low': 'badge-gray',
    'medium': 'badge-blue',
    'high': 'badge-yellow',
    'urgent': 'badge-red',
  };
  return classes[priority] || classes['medium'];
};

const getAssigneeName = (assigneeId) => {
  const member = teamMembers.value.find(m => m.id === assigneeId);
  return member ? (member.displayName || member.email) : 'Unknown';
};

const getAssigneeInitials = (assigneeId) => {
  const member = teamMembers.value.find(m => m.id === assigneeId);
  return teamStore.getUserInitials(member);
};

const getTypeClass = (type) => {
  const classes = {
    'Design': 'badge-purple',
    'Development': 'badge-blue',
    'Documentation': 'badge-green',
    'Community': 'badge-yellow',
    'Meeting': 'badge-purple',
    'Other': 'badge-gray',
  };
  return classes[type] || 'badge-gray';
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
  emit('updateStatus', { taskId: task.id, status: newStatus });
};
</script>
