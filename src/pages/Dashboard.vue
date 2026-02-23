<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">{{ greeting }}, {{ userName }}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ formattedDate }}</p>
    </div>

    <!-- Stats Grid -->
    <div class="mb-8">
      <StatsGrid
        :tasks="taskStore.tasks"
        :projects="projectStore.projects"
        :clients="clientStore.clients"
        :campaigns="[]"
      />
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card title="Tasks by Status">
        <div v-if="tasksLoading" class="flex justify-center py-8">
          <LoadingSpinner size="small" text="Loading chart..." />
        </div>
        <TasksByStatusChart v-else :tasks="taskStore.tasks" />
      </Card>

      <Card title="Project Status">
        <div v-if="projectStore.isLoading" class="flex justify-center py-8">
          <LoadingSpinner size="small" text="Loading chart..." />
        </div>
        <ProjectCompletionChart v-else :projects="projectStore.projects" />
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card title="Tasks Due (Next 4 Weeks)">
        <div v-if="tasksLoading" class="flex justify-center py-8">
          <LoadingSpinner size="small" text="Loading chart..." />
        </div>
        <TasksDueChart v-else :tasks="taskStore.tasks" />
      </Card>

      <!-- Quick Actions / Summary Card -->
      <Card title="Quick Summary">
        <div class="space-y-4">
          <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
            <div class="flex items-center space-x-2">
              <div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  class="bg-green-500 h-2 rounded-full transition-all duration-500"
                  :style="{ width: completionRate + '%' }"
                ></div>
              </div>
              <span class="text-sm font-semibold text-gray-800 dark:text-white">{{ completionRate }}%</span>
            </div>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-400">Blocked Tasks</span>
            <span class="text-sm font-semibold text-red-600 dark:text-red-400">{{ blockedTasks }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span class="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
            <span class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{{ inProgressTasks }}</span>
          </div>
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Active Projects</span>
            <span class="text-sm font-semibold text-purple-600 dark:text-purple-400">{{ projectStats.active }}</span>
          </div>
        </div>
      </Card>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Tasks -->
      <div class="card lg:col-span-2">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Recent Tasks</h3>
          <router-link to="/tasks" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">View all</router-link>
        </div>
        <div v-if="tasksLoading" class="text-center py-4">
             <LoadingSpinner size="small" text="Loading tasks..." />
        </div>
        <div v-else-if="recentTasks.length === 0" class="text-center py-6">
          <p class="text-gray-500 dark:text-gray-400">No recent tasks found.</p>
        </div>
        <ul v-else class="space-y-3">
          <li v-for="task in recentTasks" :key="task.id" class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <div>
              <router-link :to="`/tasks/${task.id}`" class="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">{{ task.title }}</router-link>
              <p class="text-xs text-gray-600 dark:text-gray-400">{{ getProjectName(task.projectId) }}</p>
            </div>
            <span :class="`px-2 py-0.5 rounded-full text-xs ${getTaskStatusClass(task.status)}`">
              {{ task.status }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Upcoming Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Upcoming</h2>

        <div v-if="isLoadingUpcoming" class="flex justify-center py-4">
          <LoadingSpinner size="small" text="Loading upcoming items..." />
        </div>

        <div v-else-if="!upcomingItems.length" class="py-4 text-center">
          <p class="text-gray-500">No upcoming items found.</p>
        </div>

        <ul v-else class="space-y-3">
          <li v-for="item in upcomingItems" :key="item.id"
              class="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
            <div class="flex items-start space-x-3">
              <div class="mt-1 w-3 h-3 rounded-full flex-shrink-0" :class="getColorClass(item.color || item.type)"></div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ item.title }}</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatUpcomingDate(item.date) }}
                  <span class="ml-2 px-2 py-0.5 rounded text-xs"
                        :class="getTypeClass(item.type)">
                    {{ capitalizeFirstLetter(item.type) }}
                  </span>
                </p>
              </div>
            </div>
            <router-link
              :to="getItemLink(item)"
              class="text-blue-500 hover:text-blue-700 text-sm font-medium">
              View
            </router-link>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectStore } from '../stores/project';
import { useTaskStore } from '../stores/task';
import { useClientStore } from '../stores/client';
import { useCalendarStore } from '../stores/calendar';
import { useAuthStore } from '../stores/auth';
import { format, isToday, isTomorrow, addDays, isWithinInterval } from 'date-fns';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Card from '../components/ui/Card.vue';
import StatsGrid from '../components/dashboard/StatsGrid.vue';
import TasksByStatusChart from '../components/dashboard/TasksByStatusChart.vue';
import ProjectCompletionChart from '../components/dashboard/ProjectCompletionChart.vue';
import TasksDueChart from '../components/dashboard/TasksDueChart.vue';
import { useToast } from 'vue-toastification';

const router = useRouter();
const projectStore = useProjectStore();
const taskStore = useTaskStore();
const clientStore = useClientStore();
const calendarStore = useCalendarStore();
const authStore = useAuthStore();

const userName = computed(() => {
  const name = authStore.user?.name || 'there';
  return name.split(' ')[0];
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const formattedDate = computed(() => format(new Date(), 'EEEE, MMMM d, yyyy'));

const upcomingItems = ref([]);
const tasksLoading = ref(false);
const isLoadingUpcoming = ref(false);

// --- Stats ---
const projectStats = computed(() => ({
  total: Array.isArray(projectStore.projects) ? projectStore.projects.length : 0,
  active: Array.isArray(projectStore.projects) ? projectStore.projects.filter(p => p.status === 'In Progress').length : 0
}));

const taskStats = computed(() => ({
  total: Array.isArray(taskStore.tasks) ? taskStore.tasks.length : 0,
  pending: Array.isArray(taskStore.tasks) ? taskStore.tasks.filter(t => t.status !== 'Done').length : 0
}));

const clientStats = computed(() => ({
  total: clientStore.clients.length
}));

// --- Chart helpers ---
const completionRate = computed(() => {
  const tasks = Array.isArray(taskStore.tasks) ? taskStore.tasks : [];
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return Math.round((done / tasks.length) * 100);
});

const blockedTasks = computed(() => {
  const tasks = Array.isArray(taskStore.tasks) ? taskStore.tasks : [];
  return tasks.filter(t => t.status === 'Blocked').length;
});

const inProgressTasks = computed(() => {
  const tasks = Array.isArray(taskStore.tasks) ? taskStore.tasks : [];
  return tasks.filter(t => t.status === 'In Progress').length;
});

// --- Recent Tasks ---
const recentTasks = computed(() => {
  if (!Array.isArray(taskStore.tasks)) return []; // Guard
  return [...taskStore.tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
});

const getProjectName = (projectId) => {
  const project = projectStore.projects.find(p => p.id === projectId);
  return project ? project.title : 'No Project';
};

const getTaskStatusClass = (status) => {
  const classes = {
      'To Do': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return classes[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

// Load upcoming items from calendar, projects and tasks
async function loadUpcomingItems() {
  isLoadingUpcoming.value = true;

  try {
    // Use the calendar store's getUpcomingItems function that combines calendar events,
    // projects with deadlines, and tasks with due dates
    const result = await calendarStore.getUpcomingItems(14); // Get items for next 14 days

    if (result.success) {
      upcomingItems.value = result.items;
    } else {
      console.error('Failed to load upcoming items:', result.error);
    }
  } catch (error) {
    console.error('Error loading upcoming items:', error);
  } finally {
    isLoadingUpcoming.value = false;
  }
}

// Helper function to format date for upcoming items
function formatUpcomingDate(date) {
  if (!date) return 'No date';

  const dateObj = new Date(date);

  if (isToday(dateObj)) {
    return `Today, ${format(dateObj, 'h:mm a')}`;
  } else if (isTomorrow(dateObj)) {
    return `Tomorrow, ${format(dateObj, 'h:mm a')}`;
  } else {
    return format(dateObj, 'MMM d, h:mm a');
  }
}

// Get CSS color class based on item type or color
function getColorClass(typeOrColor) {
  const colorMap = {
    'task': 'bg-blue-500',
    'project': 'bg-orange-500',
    'event': 'bg-green-500',
    'blue': 'bg-blue-500',
    'orange': 'bg-orange-500',
    'green': 'bg-green-500',
    'red': 'bg-red-500',
    'purple': 'bg-purple-500'
  };

  return colorMap[typeOrColor] || 'bg-gray-500';
}

// Get CSS class for the type badge
function getTypeClass(type) {
  const typeMap = {
    'task': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'project': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'event': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  };

  return typeMap[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}

// Helper to capitalize first letter
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Get appropriate router link based on item type
function getItemLink(item) {
  if (item.type === 'task' && item.taskId) {
    return `/tasks/${item.taskId}`;
  } else if (item.type === 'project' && item.projectId) {
    return `/projects/${item.projectId}`;
  } else if (item.type === 'event') {
    return '/calendar';
  }
  return '#';
}

// Initial data fetch
onMounted(async () => {
  tasksLoading.value = true;
  isLoadingUpcoming.value = true; // Set loading true here
  try {
    await Promise.all([
        projectStore.fetchProjects(),
        taskStore.fetchTasks(),
        clientStore.fetchClients(),
        loadUpcomingItems() // Fetch upcoming based on loaded tasks
    ]);
  } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Show error state or toast?
  } finally {
      tasksLoading.value = false;
      // isLoadingUpcoming is set within its own function
  }
});
</script>

<style scoped>
/* Add styles if needed */
</style>
