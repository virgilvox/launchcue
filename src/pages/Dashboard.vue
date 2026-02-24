<template>
  <div>
    <!-- Greeting + Date -->
    <div class="mb-6">
      <h2 class="font-display text-h1 sm:text-display text-[var(--text-primary)]">{{ greeting }}, {{ userName }}</h2>
      <p class="mono text-caption mt-1">{{ formattedDate }}</p>
    </div>

    <!-- Quick Actions Bar -->
    <div class="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
      <router-link to="/tasks" class="btn btn-sm btn-outline">
        <PlusIcon class="h-4 w-4 mr-1" /> TASK
      </router-link>
      <router-link to="/calendar" class="btn btn-sm btn-outline">
        <CalendarIcon class="h-4 w-4 mr-1" /> EVENT
      </router-link>
      <router-link to="/notes" class="btn btn-sm btn-outline">
        <DocumentTextIcon class="h-4 w-4 mr-1" /> NOTE
      </router-link>
      <router-link to="/clients" class="btn btn-sm btn-outline">
        <UsersIcon class="h-4 w-4 mr-1" /> CLIENT
      </router-link>
      <router-link to="/brain-dump" class="btn btn-sm bg-[var(--accent-hot)] text-white border-[var(--accent-hot)]">
        <LightBulbIcon class="h-4 w-4 mr-1" /> BRAIN DUMP
      </router-link>
    </div>

    <!-- Getting Started Checklist -->
    <GettingStarted
      :hasTeam="!!authStore.currentTeam"
      :hasClient="clientStore.clients.length > 0"
      :hasProject="projectStore.projects.length > 0"
      :hasTask="taskStore.tasks.length > 0"
      :hasBrainDump="false"
    />

    <!-- Stats -->
    <div class="mb-8">
      <StatsGrid
        :tasks="taskStore.tasks"
        :projects="projectStore.projects"
        :clients="clientStore.clients"
        :campaigns="[]"
      />
    </div>

    <!-- Main Content: 2-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Left Column (2/3) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Recent Tasks -->
        <div class="card">
          <div class="flex justify-between items-center mb-4">
            <h3 class="heading-card">Recent Tasks</h3>
            <router-link to="/tasks" class="btn btn-ghost btn-sm">VIEW ALL</router-link>
          </div>
          <div v-if="tasksLoading" class="flex justify-center py-6">
            <LoadingSpinner size="small" text="Loading tasks..." />
          </div>
          <div v-else-if="recentTasks.length === 0" class="text-center py-6">
            <p class="text-caption">No recent tasks found.</p>
          </div>
          <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
          <table class="w-full min-w-[480px]">
            <thead>
              <tr>
                <th>TASK</th>
                <th>PROJECT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="task in recentTasks"
                :key="task.id"
                class="hover:bg-[var(--surface)] cursor-pointer"
                @click="$router.push(`/tasks/${task.id}`)"
              >
                <td class="font-medium">{{ task.title }}</td>
                <td class="text-[var(--text-secondary)]">{{ getProjectName(task.projectId) }}</td>
                <td>
                  <span :class="['badge', getTaskStatusClass(task.status)]">
                    {{ task.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>

        <!-- Activity Feed -->
        <ActivityFeed />

        <!-- Client Health -->
        <ClientHealthWidget
          :clients="clientStore.clients"
          :tasks="taskStore.tasks"
        />
      </div>

      <!-- Right Column (1/3) — Upcoming sidebar -->
      <div class="space-y-6">
        <!-- Upcoming -->
        <div class="card lg:sticky lg:top-6">
          <h3 class="heading-card mb-4">Upcoming</h3>

          <div v-if="isLoadingUpcoming" class="flex justify-center py-4">
            <LoadingSpinner size="small" text="Loading..." />
          </div>

          <div v-else-if="!upcomingItems.length" class="text-center py-6">
            <p class="text-caption">No upcoming items.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in upcomingItems"
              :key="item.id"
              class="flex items-start gap-3 p-3 border-2 border-[var(--border-light)] hover:border-[var(--border)] transition-colors"
            >
              <div class="mt-1 w-2.5 h-2.5 flex-shrink-0" :class="getColorClass(item.color || item.type)"></div>
              <div class="flex-1 min-w-0">
                <p class="text-body-sm font-medium">{{ item.title }}</p>
                <p class="mono text-caption mt-0.5">
                  {{ formatUpcomingDate(item.date) }}
                </p>
                <span :class="['badge mt-1', getTypeClass(item.type)]">
                  {{ capitalizeFirstLetter(item.type) }}
                </span>
              </div>
              <router-link
                :to="getItemLink(item)"
                class="text-body-sm font-medium text-[var(--accent-primary)] hover:underline flex-shrink-0"
              >
                VIEW
              </router-link>
            </div>
          </div>
        </div>

        <!-- Outstanding Invoices -->
        <OutstandingInvoices :invoices="invoices" />

        <!-- Quick Summary -->
        <div class="card">
          <h3 class="heading-card mb-4">Quick Summary</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
              <span class="overline">COMPLETION</span>
              <div class="flex items-center gap-2">
                <div class="w-24 progress-brutal">
                  <div class="progress-brutal-fill" :style="{ width: completionRate + '%' }"></div>
                </div>
                <span class="mono text-body-sm font-bold">{{ completionRate }}%</span>
              </div>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
              <span class="overline">BLOCKED</span>
              <span class="mono text-body-sm font-bold text-[var(--danger)]">{{ blockedTasks }}</span>
            </div>
            <div class="flex items-center justify-between py-2 border-b border-[var(--border-light)]">
              <span class="overline">IN PROGRESS</span>
              <span class="mono text-body-sm font-bold text-[var(--warning)]">{{ inProgressTasks }}</span>
            </div>
            <div class="flex items-center justify-between py-2">
              <span class="overline">ACTIVE PROJECTS</span>
              <span class="mono text-body-sm font-bold">{{ projectStats.active }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts below fold -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
import { getStatusColor } from '@/utils/statusColors';
import { useEntityLookup } from '@/composables/useEntityLookup';
import {
  PlusIcon,
  CalendarIcon,
  DocumentTextIcon,
  UsersIcon,
  LightBulbIcon,
} from '@heroicons/vue/24/outline';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import Card from '../components/ui/Card.vue';
import StatsGrid from '../components/dashboard/StatsGrid.vue';
import TasksByStatusChart from '../components/dashboard/TasksByStatusChart.vue';
import ProjectCompletionChart from '../components/dashboard/ProjectCompletionChart.vue';
import ActivityFeed from '../components/dashboard/ActivityFeed.vue';
import GettingStarted from '../components/dashboard/GettingStarted.vue';
import ClientHealthWidget from '../components/dashboard/ClientHealthWidget.vue';
import OutstandingInvoices from '../components/dashboard/OutstandingInvoices.vue';

const router = useRouter();
const projectStore = useProjectStore();
const taskStore = useTaskStore();
const clientStore = useClientStore();
const calendarStore = useCalendarStore();
const authStore = useAuthStore();
const { getProjectName } = useEntityLookup();

// Invoice store loaded lazily in onMounted to avoid top-level await
const invoiceStoreRef = ref(null);
const invoices = computed(() => invoiceStoreRef.value?.invoices || []);

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

// Stats
const projectStats = computed(() => ({
  total: Array.isArray(projectStore.projects) ? projectStore.projects.length : 0,
  active: Array.isArray(projectStore.projects) ? projectStore.projects.filter(p => p.status === 'In Progress').length : 0
}));

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

// Recent Tasks
const recentTasks = computed(() => {
  if (!Array.isArray(taskStore.tasks)) return [];
  return [...taskStore.tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
});

const getTaskStatusClass = (status) => getStatusColor(status);

// Upcoming
async function loadUpcomingItems() {
  isLoadingUpcoming.value = true;
  try {
    const result = await calendarStore.getUpcomingItems(14);
    if (result.success) {
      upcomingItems.value = result.items;
    }
  } catch (error) {
    console.error('Error loading upcoming items:', error);
  } finally {
    isLoadingUpcoming.value = false;
  }
}

function formatUpcomingDate(date) {
  if (!date) return 'No date';
  const dateObj = new Date(date);
  if (isToday(dateObj)) return `Today, ${format(dateObj, 'h:mm a')}`;
  if (isTomorrow(dateObj)) return `Tomorrow, ${format(dateObj, 'h:mm a')}`;
  return format(dateObj, 'MMM d, h:mm a');
}

function getColorClass(typeOrColor) {
  const colorMap = {
    'task': 'bg-[#2563EB]',
    'project': 'bg-[var(--warning)]',
    'event': 'bg-[var(--success)]',
    'blue': 'bg-[#2563EB]',
    'orange': 'bg-[var(--warning)]',
    'green': 'bg-[var(--success)]',
    'red': 'bg-[var(--danger)]',
    'purple': 'bg-[#7C3AED]'
  };
  return colorMap[typeOrColor] || 'bg-[var(--text-secondary)]';
}

function getTypeClass(type) {
  const typeMap = {
    'task': 'badge-blue',
    'project': 'badge-yellow',
    'event': 'badge-green'
  };
  return typeMap[type] || 'badge-gray';
}

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getItemLink(item) {
  if (item.type === 'task' && item.taskId) return `/tasks/${item.taskId}`;
  if (item.type === 'project' && item.projectId) return `/projects/${item.projectId}`;
  if (item.type === 'event') return '/calendar';
  return '#';
}

// Initial data fetch
onMounted(async () => {
  tasksLoading.value = true;
  isLoadingUpcoming.value = true;

  // Lazily load invoice store
  try {
    const { useInvoiceStore } = await import('../stores/invoice');
    invoiceStoreRef.value = useInvoiceStore();
  } catch {
    // Invoice store not available, that's fine
  }

  try {
    const fetches = [
      projectStore.fetchProjects(),
      taskStore.fetchTasks(),
      clientStore.fetchClients(),
      loadUpcomingItems(),
    ];
    if (invoiceStoreRef.value?.fetchInvoices) {
      fetches.push(invoiceStoreRef.value.fetchInvoices());
    }
    // Use allSettled so one failing call doesn't block the rest
    const results = await Promise.allSettled(fetches);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Dashboard fetch #${i} failed:`, result.reason);
      }
    });
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  } finally {
    tasksLoading.value = false;
  }
});
</script>
