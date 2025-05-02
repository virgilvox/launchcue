<template>
  <div v-if="loading" class="p-8 text-center">Loading task details...</div>
  <div v-else-if="error" class="p-8 text-center text-red-500">Error loading task: {{ error }}</div>
  <div v-else-if="task" class="p-6">
    <h2 class="text-2xl font-bold mb-4">{{ task.title }}</h2>
    <p class="mb-2"><strong>Status:</strong> {{ task.status }}</p>
    <p v-if="task.dueDate" class="mb-2"><strong>Due Date:</strong> {{ formattedDueDate }}</p>
    <p v-if="task.projectId" class="mb-2"><strong>Project:</strong> {{ projectName }}</p>
    <p v-if="task.clientId" class="mb-4"><strong>Client:</strong> {{ clientName }}</p>
    
    <div class="prose dark:prose-invert max-w-none mt-4" v-if="task.description">
      <h3 class="text-lg font-semibold mb-2">Description</h3>
      <p>{{ task.description }}</p>
    </div>

    <div v-if="task.checklist && task.checklist.length > 0" class="mt-6">
      <h3 class="text-lg font-semibold mb-2">Checklist</h3>
      <ul>
        <li v-for="item in task.checklist" :key="item.id || item.title"
            :class="{ 'line-through text-gray-500': item.completed }">
          <input type="checkbox" :checked="item.completed" disabled class="mr-2"> 
          {{ item.title }}
        </li>
      </ul>
    </div>

    <div class="mt-6">
        <router-link :to="{ name: 'tasks' }" class="text-blue-500 hover:underline">
          &larr; Back to Tasks
        </router-link>
    </div>
  </div>
  <div v-else class="p-8 text-center">Task not found.</div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTaskStore } from '../stores/task';
import { useProjectStore } from '../stores/project';
import { useClientStore } from '../stores/client';
import { format } from 'date-fns';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const clientStore = useClientStore();

const task = ref(null);
const loading = ref(true);
const error = ref(null);

const fetchTaskDetails = async (taskId) => {
  loading.value = true;
  error.value = null;
  try {
    // Ensure stores are loaded if needed
    if (!projectStore.projects.length) await projectStore.fetchProjects();
    if (!clientStore.clients.length) await clientStore.fetchClients();

    const fetchedTask = await taskStore.getTaskById(taskId);
    if (fetchedTask) {
      task.value = fetchedTask;
    } else {
      error.value = 'Task could not be found.';
      task.value = null;
    }
  } catch (err) {
    console.error("Error fetching task details:", err);
    error.value = err.message || 'Failed to load task details.';
  } finally {
    loading.value = false;
  }
};

const formattedDueDate = computed(() => {
  return task.value?.dueDate ? format(new Date(task.value.dueDate), 'PPP') : 'Not set';
});

const projectName = computed(() => {
  if (!task.value?.projectId) return 'N/A';
  const project = projectStore.projects.find(p => p.id === task.value.projectId);
  return project ? project.title : 'Unknown Project';
});

const clientName = computed(() => {
  if (!task.value?.clientId) return 'N/A'; // Note: Tasks might not have direct clientId
  // Infer client from project if not directly on task
  if (task.value.projectId) {
    const project = projectStore.projects.find(p => p.id === task.value.projectId);
    if (project?.clientId) {
      const client = clientStore.clients.find(c => c.id === project.clientId);
      return client ? client.name : 'Unknown Client';
    }
  }
  return 'N/A';
});

// Fetch task when component mounts or ID prop changes
onMounted(() => {
  fetchTaskDetails(props.id);
});

watch(() => props.id, (newId) => {
  if (newId) {
    fetchTaskDetails(newId);
  }
});
</script> 