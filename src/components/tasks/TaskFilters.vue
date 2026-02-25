<template>
  <div class="card mb-6">
    <div class="flex items-center gap-3 mb-3">
      <button
        @click="toggleMyTasks"
        :class="[
          'btn btn-sm',
          isMyTasks ? 'btn-primary' : 'btn-outline'
        ]"
      >
        {{ isMyTasks ? 'SHOWING MY TASKS' : 'MY TASKS' }}
      </button>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div>
        <label for="status-filter" class="label">STATUS</label>
        <select
          id="status-filter"
          :value="modelValue.status"
          @input="updateFilter('status', $event.target.value)"
          class="input"
        >
          <option value="">All</option>
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>
      <div>
        <label for="priority-filter" class="label">PRIORITY</label>
        <select
          id="priority-filter"
          :value="modelValue.priority"
          @input="updateFilter('priority', $event.target.value)"
          class="input"
        >
          <option value="">All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label for="type-filter" class="label">TYPE</label>
        <select
          id="type-filter"
          :value="modelValue.type"
          @input="updateFilter('type', $event.target.value)"
          class="input"
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
      <div>
        <label for="assignee-filter" class="label">ASSIGNEE</label>
        <select
          id="assignee-filter"
          :value="modelValue.assigneeId"
          @input="updateFilter('assigneeId', $event.target.value || null)"
          class="input"
        >
          <option value="">All</option>
          <option v-for="member in teamMembers" :key="member.id" :value="member.id">
            {{ member.displayName || member.email }}
          </option>
        </select>
      </div>
      <div>
        <label for="client-filter" class="label">CLIENT</label>
        <select
          id="client-filter"
          :value="modelValue.clientId"
          @input="updateFilter('clientId', $event.target.value || null)"
          class="input"
        >
          <option value="">All Clients</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.name }}
          </option>
        </select>
      </div>
      <div>
        <label for="project-filter" class="label">PROJECT</label>
        <select
          id="project-filter"
          :value="modelValue.projectId"
          @input="updateFilter('projectId', $event.target.value || null)"
          class="input"
        >
          <option value="">All Projects</option>
          <option v-for="project in filteredProjectsForClient" :key="project.id" :value="project.id">
              {{ project.title }}
          </option>
        </select>
      </div>
      <div>
        <label for="sort-by" class="label">SORT BY</label>
        <select
          id="sort-by"
          :value="modelValue.sortBy"
          @input="updateFilter('sortBy', $event.target.value)"
          class="input"
        >
          <option value="dueDate">Due Date</option>
          <option value="createdAt">Created Date</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
          <option value="type">Type</option>
          <option value="priority">Priority</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useProjectStore } from '../../stores/project';
import { useClientStore } from '../../stores/client';
import { useTeamStore } from '../../stores/team';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
        status: '',
        type: '',
        priority: '',
        assigneeId: null,
        clientId: null,
        projectId: null,
        sortBy: 'dueDate'
    })
  }
});

const emit = defineEmits(['update:modelValue']);

const projectStore = useProjectStore();
const clientStore = useClientStore();
const teamStore = useTeamStore();
const authStore = useAuthStore();

const isMyTasks = computed(() => props.modelValue.assigneeId === authStore.user?.id);

const toggleMyTasks = () => {
  if (isMyTasks.value) {
    updateFilter('assigneeId', null);
  } else {
    updateFilter('assigneeId', authStore.user?.id || null);
  }
};

const projects = computed(() => projectStore.projects);
const clients = computed(() => clientStore.clients);
const teamMembers = computed(() => teamStore.validTeamMembers);

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
</script>
