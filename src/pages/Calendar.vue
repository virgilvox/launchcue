<template>
  <div class="flex flex-col h-full">
    <header class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Project Calendar View</h2>

      <!-- Filter controls -->
      <div class="flex flex-wrap gap-4 mt-4">
        <div class="w-64">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Client</label>
          <select v-model="filterClientId" class="input select-bordered w-full">
            <option :value="null">All Clients</option>
            <option v-for="client in clients" :key="client.id" :value="client.id" class="text-gray-800 dark:text-white">
              {{ client.name }}
            </option>
          </select>
        </div>

        <div class="w-64">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Project</label>
          <select v-model="filterProjectId" class="input select-bordered w-full">
            <option :value="null">All Projects</option>
            <option v-for="project in filteredProjects" :key="project.id" :value="project.id" class="text-gray-800 dark:text-white">
              {{ project.name }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <button @click="clearFilters" class="btn btn-outline btn-sm">
            Clear Filters
          </button>
        </div>
      </div>
    </header>

    <div class="flex flex-1 space-x-6">
      <!-- Calendar and Task List -->
      <div class="flex-1 flex flex-col">
        <!-- Navigation and View Toggle -->
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-2">
            <button
              @click="navigatePrev"
              class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-purple-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            <button
              @click="goToToday"
              class="px-3 py-1.5 text-sm font-medium rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
            >
              Today
            </button>

            <button
              @click="navigateNext"
              class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-purple-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            <h3 class="text-xl font-semibold text-gray-800 dark:text-white ml-2">{{ headerTitle }}</h3>
          </div>

          <!-- View Toggle Buttons -->
          <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            <button
              @click="calendarView = 'month'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors',
                calendarView === 'month'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              Month
            </button>
            <button
              @click="calendarView = 'week'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors border-l border-r border-gray-300 dark:border-gray-600',
                calendarView === 'week'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              Week
            </button>
            <button
              @click="calendarView = 'day'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors',
                calendarView === 'day'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              Day
            </button>
          </div>
        </div>

        <!-- ==================== MONTH VIEW ==================== -->
        <div v-if="calendarView === 'month'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
          <!-- Days of Week Header -->
          <div class="grid grid-cols-7 border-b dark:border-gray-700">
            <div v-for="day in daysOfWeek" :key="day" class="py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ day }}
            </div>
          </div>

          <!-- Calendar Days -->
          <div class="grid grid-cols-7 h-[30rem]">
            <div
              v-for="(day, index) in calendarDays"
              :key="index"
              :class="[
                'border-b border-r dark:border-gray-700 p-1 relative',
                day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900',
                day.isToday ? 'font-bold' : ''
              ]"
            >
              <div class="flex justify-between p-1">
                <span
                  :class="[
                    'text-sm inline-block w-6 h-6 leading-6 text-center rounded-full',
                    day.isToday ? 'bg-primary-500 text-white' : 'text-gray-700 dark:text-gray-300'
                  ]"
                >
                  {{ day.date.getDate() }}
                </span>
                <span class="text-xs text-gray-700 dark:text-gray-300">{{ getDateInfo(day.date) }}</span>
              </div>

              <!-- Events for this day -->
              <div class="mt-1 space-y-1 max-h-[80%] overflow-y-auto">
                <div
                  v-for="event in getEventsForDay(day.date)"
                  :key="event.id"
                  :class="`bg-${event.color}-500 text-white text-xs py-1 px-2 rounded truncate cursor-pointer hover:opacity-80`"
                  @click="navigateToEvent(event)"
                >
                  {{ getEventTitle(event) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== WEEK VIEW ==================== -->
        <div v-if="calendarView === 'week'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
          <!-- Week Day Headers -->
          <div class="grid grid-cols-[4rem_repeat(7,1fr)] border-b dark:border-gray-700">
            <!-- Empty corner for time gutter -->
            <div class="py-2 border-r dark:border-gray-700"></div>
            <div
              v-for="day in weekDays"
              :key="day.dateStr"
              :class="[
                'py-2 text-center border-r dark:border-gray-700 last:border-r-0',
                day.isToday ? 'bg-purple-50 dark:bg-purple-900/20' : ''
              ]"
            >
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ day.dayName }}</div>
              <div
                :class="[
                  'text-lg font-semibold mt-0.5',
                  day.isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-white'
                ]"
              >
                {{ day.dayNum }}
              </div>
            </div>
          </div>

          <!-- All-Day Events Row -->
          <div v-if="hasAllDayEventsInWeek" class="grid grid-cols-[4rem_repeat(7,1fr)] border-b dark:border-gray-700">
            <div class="px-1 py-1 text-xs text-gray-500 dark:text-gray-400 border-r dark:border-gray-700 flex items-center justify-center">
              All Day
            </div>
            <div
              v-for="day in weekDays"
              :key="'allday-' + day.dateStr"
              class="px-1 py-1 border-r dark:border-gray-700 last:border-r-0 min-h-[2rem]"
            >
              <div
                v-for="event in getAllDayEventsForDay(day.date)"
                :key="event.id"
                :class="`bg-${event.color}-500 text-white text-xs py-0.5 px-1.5 rounded truncate cursor-pointer hover:opacity-80 mb-0.5`"
                @click="navigateToEvent(event)"
              >
                {{ getEventTitle(event) }}
              </div>
            </div>
          </div>

          <!-- Time Grid -->
          <div class="overflow-y-auto max-h-[32rem]">
            <div class="grid grid-cols-[4rem_repeat(7,1fr)]">
              <template v-for="hour in weekHours" :key="hour">
                <!-- Hour Row -->
                <div class="h-14 border-b border-r dark:border-gray-700 px-1 text-xs text-gray-500 dark:text-gray-400 text-right pr-2 pt-0.5">
                  {{ formatHour(hour) }}
                </div>
                <div
                  v-for="day in weekDays"
                  :key="day.dateStr + '-' + hour"
                  :class="[
                    'h-14 border-b border-r dark:border-gray-700 last:border-r-0 relative',
                    day.isToday ? 'bg-purple-50/30 dark:bg-purple-900/10' : ''
                  ]"
                >
                  <!-- Events positioned by time -->
                  <div
                    v-for="event in getTimedEventsForDayHour(day.date, hour)"
                    :key="event.id"
                    :class="`absolute inset-x-0.5 bg-${event.color}-500 text-white text-xs py-0.5 px-1 rounded cursor-pointer hover:opacity-80 z-10 overflow-hidden`"
                    :style="getWeekEventStyle(event, hour)"
                    @click="navigateToEvent(event)"
                  >
                    <div class="font-medium truncate">{{ getEventTitle(event) }}</div>
                    <div v-if="event.start" class="truncate opacity-80">{{ formatEventTime(event.start) }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ==================== DAY VIEW ==================== -->
        <div v-if="calendarView === 'day'" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
          <!-- Day Header -->
          <div class="py-3 px-4 border-b dark:border-gray-700 text-center">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{{ dayViewHeader.dayName }}</div>
            <div
              :class="[
                'text-2xl font-bold mt-0.5',
                dayViewHeader.isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-800 dark:text-white'
              ]"
            >
              {{ dayViewHeader.dayNum }}
            </div>
          </div>

          <!-- All-Day Events -->
          <div v-if="dayAllDayEvents.length > 0" class="px-4 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase">All Day</div>
            <div class="flex flex-wrap gap-1">
              <div
                v-for="event in dayAllDayEvents"
                :key="event.id"
                :class="`bg-${event.color}-500 text-white text-xs py-1 px-2 rounded cursor-pointer hover:opacity-80`"
                @click="navigateToEvent(event)"
              >
                {{ getEventTitle(event) }}
              </div>
            </div>
          </div>

          <!-- Time Slots -->
          <div class="overflow-y-auto max-h-[36rem]">
            <div class="grid grid-cols-[5rem_1fr]">
              <template v-for="hour in dayHours" :key="hour">
                <div class="h-16 border-b border-r dark:border-gray-700 px-2 text-xs text-gray-500 dark:text-gray-400 text-right pr-3 pt-1">
                  {{ formatHour(hour) }}
                </div>
                <div class="h-16 border-b dark:border-gray-700 relative">
                  <!-- Timed events -->
                  <div
                    v-for="event in getTimedEventsForDayViewHour(currentDate, hour)"
                    :key="event.id"
                    :class="`absolute left-1 right-1 bg-${event.color}-500 text-white text-xs rounded cursor-pointer hover:opacity-80 z-10 overflow-hidden px-2 py-1`"
                    :style="getDayEventStyle(event, hour)"
                    @click="navigateToEvent(event)"
                  >
                    <div class="font-medium truncate">{{ getEventTitle(event) }}</div>
                    <div class="truncate opacity-80">
                      {{ formatEventTime(event.start) }}
                      <span v-if="event.end"> - {{ formatEventTime(event.end) }}</span>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Task List -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Task List</h4>

          <div v-if="loading || eventsLoading" class="py-4 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
          </div>

          <div v-else-if="filteredTasks.length === 0" class="py-4 text-center text-gray-700 dark:text-gray-300">
            No tasks found for this period.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              @click="navigateToTask(task)"
            >
              <div class="flex items-center">
                <div :class="`w-2 h-2 rounded-full bg-${task.statusColor}-500 mr-3`"></div>
                <span class="text-gray-800 dark:text-gray-200">{{ task.title }}</span>
              </div>
              <div class="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <span>{{ task.status }}</span>
                <span class="mx-2">•</span>
                <span>{{ formatDate(task.dueDate) }}</span>
                <svg class="h-5 w-5 ml-2 text-gray-700 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Details Sidebar -->
      <div class="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
        <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-6">Event Details</h3>

        <div v-if="!selectedEvent" class="text-center text-gray-700 dark:text-gray-300 py-8">
          Select an event to view details
        </div>

        <div v-else class="space-y-6">
          <!-- Event Type and Title -->
          <div>
            <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">
              {{ selectedEvent.type === 'task' ? 'Task' : selectedEvent.type === 'project' ? 'Project' : 'Event' }}
            </h4>
            <p class="text-lg font-medium text-gray-900 dark:text-white">
              {{ selectedEvent.title || getEventTitle(selectedEvent) }}
            </p>
            <p v-if="selectedEvent.description" class="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {{ selectedEvent.description }}
            </p>
          </div>

          <!-- Date Information -->
          <div v-if="selectedEvent.start">
            <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Date</h4>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ formatDate(selectedEvent.start) }}
              <span v-if="selectedEvent.end && selectedEvent.end !== selectedEvent.start">
                - {{ formatDate(selectedEvent.end) }}
              </span>
            </p>
          </div>

          <!-- Project Information (if available) -->
          <div v-if="selectedEvent.projectId">
            <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Related Project</h4>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ getProjectName(selectedEvent.projectId) }}
            </p>
          </div>

          <!-- Associated Links -->
          <div v-if="projectLinks.length > 0">
            <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Associated Links</h4>
            <div class="space-y-2">
              <div v-for="(link, index) in projectLinks" :key="index" class="flex items-center">
                <svg class="h-4 w-4 text-gray-700 dark:text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <a href="#" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">{{ link }}</a>
              </div>
            </div>
          </div>

          <!-- Contacts -->
          <div v-if="projectContacts.length > 0">
            <h4 class="uppercase text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wider mb-3">Contacts</h4>
            <div class="space-y-3">
              <div v-for="contact in projectContacts" :key="contact.id" class="flex items-center">
                <div class="w-8 h-8 rounded-full overflow-hidden mr-3">
                  <img :src="contact.avatar" :alt="contact.name" class="w-full h-full object-cover" />
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">{{ contact.name }}</div>
                  <div class="text-xs text-gray-700 dark:text-gray-300">{{ contact.role }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pt-4">
            <button
              @click="navigateToEventPage(selectedEvent)"
              class="btn btn-primary btn-sm w-full"
            >
              View {{ selectedEvent.type === 'task' ? 'Task' : selectedEvent.type === 'project' ? 'Project' : 'Event' }} Details
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCalendarStore } from '../stores/calendar';
import { useProjectStore } from '../stores/project';
import { useTaskStore } from '../stores/task';
import { useClientStore } from '../stores/client';
import apiService from '../services/api.service';

const router = useRouter();
const calendarStore = useCalendarStore();
const projectStore = useProjectStore();
const taskStore = useTaskStore();
const clientStore = useClientStore();

const projects = computed(() => projectStore.projects);
const clients = computed(() => clientStore.clients);
const tasks = ref([]);

// View state
const calendarView = ref('month');

// Current date reference and navigation
const currentDate = ref(new Date());
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Loading and error states
const loading = ref(false);
const eventsLoading = computed(() => calendarStore.isLoading);
const error = computed(() => calendarStore.error);

// Data
const events = computed(() => calendarStore.events);
const selectedEvent = ref(null);
const selectedProjectId = ref(null);
const projectLinks = ref([]);
const projectContacts = ref([]);

// Filters
const filterClientId = ref(null);
const filterProjectId = ref(null);

// ============================================================
// Computed properties for filtering
// ============================================================
const filteredProjects = computed(() => {
  if (!projects.value || !Array.isArray(projects.value)) return [];

  const validProjects = projects.value.map(project => ({
    ...project,
    name: project.name || project.title || 'Untitled Project'
  }));

  if (!filterClientId.value) {
    return validProjects;
  }
  return validProjects.filter(project => project.clientId === filterClientId.value);
});

const filteredEvents = computed(() => {
  if (!events.value) return [];

  return events.value.filter(event => {
    let matchesProject = true;
    let matchesClient = true;

    if (filterProjectId.value) {
      matchesProject = event.projectId === filterProjectId.value;
    }

    if (filterClientId.value && !filterProjectId.value) {
      const clientProjects = filteredProjects.value.map(p => p.id);
      matchesClient = event.projectId && clientProjects.includes(event.projectId);
    }

    return matchesProject && matchesClient;
  }).map(event => {
    const newEvent = { ...event };

    if (newEvent.type === 'project' && newEvent.projectId && (!newEvent.title || newEvent.title === 'project')) {
      const project = projects.value.find(p => p.id === newEvent.projectId);
      if (project) {
        newEvent.title = project.name || project.title || 'Project Deadline';
      }
    }

    return newEvent;
  });
});

const filteredTasks = computed(() => {
  if (!tasks.value || !Array.isArray(tasks.value)) return [];

  return tasks.value.filter(task => {
    let matchesProject = true;
    let matchesClient = true;

    if (filterProjectId.value) {
      matchesProject = task.projectId === filterProjectId.value;
    }

    if (filterClientId.value && !filterProjectId.value) {
      const clientProjects = filteredProjects.value.map(p => p.id);
      matchesClient = task.projectId && clientProjects.includes(task.projectId);
    }

    return matchesProject && matchesClient;
  });
});

// ============================================================
// Header title (context-aware based on view)
// ============================================================
const headerTitle = computed(() => {
  if (calendarView.value === 'month') {
    return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  if (calendarView.value === 'week') {
    const start = getWeekStart(currentDate.value);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }
  // day
  return currentDate.value.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
});

// Keep backward compatibility
const formattedCurrentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
});

// ============================================================
// Navigation (context-aware)
// ============================================================
function navigatePrev() {
  const date = new Date(currentDate.value);
  if (calendarView.value === 'month') {
    date.setMonth(date.getMonth() - 1);
  } else if (calendarView.value === 'week') {
    date.setDate(date.getDate() - 7);
  } else {
    date.setDate(date.getDate() - 1);
  }
  currentDate.value = date;
}

function navigateNext() {
  const date = new Date(currentDate.value);
  if (calendarView.value === 'month') {
    date.setMonth(date.getMonth() + 1);
  } else if (calendarView.value === 'week') {
    date.setDate(date.getDate() + 7);
  } else {
    date.setDate(date.getDate() + 1);
  }
  currentDate.value = date;
}

function goToToday() {
  currentDate.value = new Date();
}

// Keep old functions as aliases for backward compat
function prevMonth() { navigatePrev(); }
function nextMonth() { navigateNext(); }

function clearFilters() {
  filterClientId.value = null;
  filterProjectId.value = null;
}

// ============================================================
// Month View: Calendar day grid
// ============================================================
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];

  const daysFromPrevMonth = firstDay.getDay();
  const prevMonthLast = new Date(year, month, 0);
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthLast.getDate() - i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, new Date())
    });
  }

  const daysFromNextMonth = 7 - (days.length % 7 || 7);
  for (let i = 1; i <= daysFromNextMonth; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    });
  }

  if (days.length < 42) {
    for (let i = daysFromNextMonth + 1; i <= daysFromNextMonth + 7; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, new Date())
      });
    }
  }

  return days;
});

// ============================================================
// Week View helpers
// ============================================================
// Hours displayed in week view: 8am to 8pm
const weekHours = computed(() => {
  const hours = [];
  for (let h = 8; h <= 20; h++) {
    hours.push(h);
  }
  return hours;
});

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const weekDays = computed(() => {
  const start = getWeekStart(currentDate.value);
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: isSameDay(d, today)
    });
  }
  return days;
});

const hasAllDayEventsInWeek = computed(() => {
  return weekDays.value.some(day => getAllDayEventsForDay(day.date).length > 0);
});

function isAllDayEvent(event) {
  if (event.allDay) return true;
  // If event has no start time info (midnight-to-midnight or no time component), treat as all-day
  if (!event.start) return true;
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : null;
  // If start is exactly midnight and end is exactly midnight of next day (or missing), consider it all-day
  if (start.getHours() === 0 && start.getMinutes() === 0) {
    if (!end) return true;
    if (end.getHours() === 0 && end.getMinutes() === 0 && end.getDate() !== start.getDate()) return true;
  }
  return false;
}

function getAllDayEventsForDay(date) {
  return getEventsForDay(date).filter(e => isAllDayEvent(e));
}

function getTimedEventsForDay(date) {
  return getEventsForDay(date).filter(e => !isAllDayEvent(e));
}

function getTimedEventsForDayHour(date, hour) {
  return getTimedEventsForDay(date).filter(event => {
    if (!event.start) return false;
    const startHour = new Date(event.start).getHours();
    return startHour === hour;
  });
}

function getWeekEventStyle(event, hour) {
  if (!event.start) return {};
  const start = new Date(event.start);
  const minuteOffset = start.getMinutes();
  const topPx = (minuteOffset / 60) * 56; // 56px = h-14 (3.5rem)

  // Calculate height based on duration
  let durationMinutes = 60; // default 1 hour
  if (event.end) {
    const end = new Date(event.end);
    durationMinutes = Math.max(30, (end - start) / 60000);
  }
  const heightPx = Math.max(20, (durationMinutes / 60) * 56);

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`,
    minHeight: '20px'
  };
}

// ============================================================
// Day View helpers
// ============================================================
// Hours displayed in day view: 6am to 10pm
const dayHours = computed(() => {
  const hours = [];
  for (let h = 6; h <= 22; h++) {
    hours.push(h);
  }
  return hours;
});

const dayViewHeader = computed(() => {
  const d = currentDate.value;
  const today = new Date();
  return {
    dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
    dayNum: d.getDate(),
    isToday: isSameDay(d, today)
  };
});

const dayAllDayEvents = computed(() => {
  return getAllDayEventsForDay(currentDate.value);
});

function getTimedEventsForDayViewHour(date, hour) {
  return getTimedEventsForDay(date).filter(event => {
    if (!event.start) return false;
    const startHour = new Date(event.start).getHours();
    return startHour === hour;
  });
}

function getDayEventStyle(event, hour) {
  if (!event.start) return {};
  const start = new Date(event.start);
  const minuteOffset = start.getMinutes();
  const topPx = (minuteOffset / 60) * 64; // 64px = h-16 (4rem)

  // Calculate height based on duration
  let durationMinutes = 60; // default 1 hour
  if (event.end) {
    const end = new Date(event.end);
    durationMinutes = Math.max(30, (end - start) / 60000);
  }
  const heightPx = Math.max(24, (durationMinutes / 60) * 64);

  return {
    top: `${topPx}px`,
    height: `${heightPx}px`,
    minHeight: '24px'
  };
}

// ============================================================
// Shared utility functions
// ============================================================
function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function getDateInfo(date) {
  return '';
}

function formatDate(dateObj) {
  if (!dateObj) return '';

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatEventTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ============================================================
// Watchers for data loading
// ============================================================

// Reload events and tasks when currentDate or calendarView changes
watch([currentDate, calendarView], () => {
  loadEventsForCurrentView();
  fetchTasks();
}, { immediate: false });

// Watch for filter changes
watch([filterClientId, filterProjectId], () => {
  if (filterClientId.value && !filterProjectId.value) {
    const clientProjects = projects.value.filter(p => p.clientId === filterClientId.value);
    if (clientProjects.length === 1) {
      filterProjectId.value = clientProjects[0].id;
    }
  }
});

// ============================================================
// Data loading
// ============================================================

// Load events based on current view and date
async function loadEventsForCurrentView() {
  let startDate, endDate;

  if (calendarView.value === 'month') {
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth();
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0);
    // Buffer for events spanning previous/next months
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 7);
  } else if (calendarView.value === 'week') {
    startDate = getWeekStart(currentDate.value);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Day view
    startDate = new Date(currentDate.value);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(currentDate.value);
    endDate.setHours(23, 59, 59, 999);
  }

  await calendarStore.fetchEvents(startDate, endDate);
}

// Keep old function name for initial mount
async function loadEventsForCurrentMonth() {
  await loadEventsForCurrentView();
}

// Get events for a specific day
function getEventsForDay(date) {
  if (!filteredEvents.value || !Array.isArray(filteredEvents.value)) return [];

  return filteredEvents.value.filter(event => {
    if (!event.start) return false;

    const eventDate = new Date(event.start);
    return eventDate.getDate() === date.getDate() &&
           eventDate.getMonth() === date.getMonth() &&
           eventDate.getFullYear() === date.getFullYear();
  });
}

async function fetchTasks() {
  try {
    loading.value = true;
    let startDate, endDate;

    if (calendarView.value === 'month') {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth();
      startDate = new Date(year, month, 1).toISOString();
      endDate = new Date(year, month + 1, 0).toISOString();
    } else if (calendarView.value === 'week') {
      const weekStart = getWeekStart(currentDate.value);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      startDate = weekStart.toISOString();
      endDate = weekEnd.toISOString();
    } else {
      const dayStart = new Date(currentDate.value);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate.value);
      dayEnd.setHours(23, 59, 59, 999);
      startDate = dayStart.toISOString();
      endDate = dayEnd.toISOString();
    }

    console.log(`Fetching tasks for date range: ${startDate} to ${endDate}`);

    const tasksResponse = await calendarStore.getTaskDeadlines(startDate, endDate);

    console.log('Tasks response received:', tasksResponse ?
      (Array.isArray(tasksResponse) ? `Array with ${tasksResponse.length} items` : typeof tasksResponse) :
      'null or undefined');

    if (Array.isArray(tasksResponse)) {
      tasks.value = tasksResponse;
      console.log(`Loaded ${tasks.value.length} tasks for calendar view`);
    } else {
      console.warn('fetchTasks: Expected array but got', typeof tasksResponse);
      tasks.value = [];
    }
  } catch (err) {
    console.error('Error fetching tasks:', err);
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

// Helper function to get task status color
function getTaskStatusColor(status) {
  if (!status) return 'gray';

  const statusLower = status.toLowerCase();
  if (statusLower.includes('complete')) return 'green';
  if (statusLower.includes('progress')) return 'blue';
  if (statusLower.includes('review')) return 'yellow';
  if (statusLower.includes('block')) return 'red';
  return 'gray';
}

// ============================================================
// Event interaction
// ============================================================

function navigateToEvent(event) {
  if (!event) {
    console.warn('Attempted to navigate to invalid event');
    return;
  }
  selectedEvent.value = event;
  selectEvent(event);
}

function navigateToTask(task) {
  if (task.projectId) {
    router.push({
      name: 'project-detail',
      params: { id: task.projectId },
      query: { taskId: task.id }
    });
  } else {
    router.push({ name: 'tasks', query: { taskId: task.id } });
  }
}

function navigateToProject(projectId) {
  if (projectId) {
    router.push({ name: 'project-detail', params: { id: projectId } });
  }
}

async function selectEvent(event) {
  if (!event || !event.projectId) {
    console.warn('No project ID found for the selected event');
    return;
  }

  selectedProjectId.value = event.projectId;
  projectLinks.value = [];
  projectContacts.value = [];

  if (selectedProjectId.value) {
    try {
      const project = projects.value.find(p => p.id === selectedProjectId.value);
      if (project) {
        projectLinks.value = project.links || [];
        projectContacts.value = project.contacts || [];
        console.log('Found project in store:', project.name);
      } else {
        try {
          const projectEndpoint = `/projects/${selectedProjectId.value}`;
          console.log('Fetching project details from API:', projectEndpoint);

          const response = await apiService.get(projectEndpoint);

          if (response && typeof response === 'object' && !response.toString().includes('<!DOCTYPE html>')) {
            console.log('Received project details from API:', response.name || response.title);
            projectLinks.value = response.links || [];
            projectContacts.value = response.contacts || [];

            if (!projects.value.some(p => p.id === selectedProjectId.value)) {
              projectStore.addProject(response);
            }
          } else {
            console.warn('Invalid project details response format', response);
          }
        } catch (apiError) {
          console.error('API error fetching project details:', apiError);
        }
      }
    } catch (err) {
      console.error('Error in selectEvent:', err);
    }
  }
}

function getProjectName(projectId) {
  if (!projectId) return 'Project';

  const project = projects.value.find(p => p.id === projectId);
  if (project) {
    return project.name || project.title || 'Project';
  }

  const relatedEvent = events.value.find(e => e.projectId === projectId && e.title && e.title !== 'Project');
  if (relatedEvent && relatedEvent.title) {
    return relatedEvent.title;
  }

  const relatedTask = tasks.value.find(t => t.projectId === projectId && t.projectName);
  if (relatedTask && relatedTask.projectName) {
    return relatedTask.projectName;
  }

  return 'Project';
}

function getEventTitle(event) {
  if (!event) return 'Untitled Event';

  if (event.type === 'project' && event.projectId) {
    const project = projects.value.find(p => p.id === event.projectId);
    if (project) {
      return project.name || project.title || 'Project Deadline';
    }
  }

  if (event.title && event.title !== 'project') {
    return event.title;
  }

  if (event.type === 'task') return 'Task';
  if (event.type === 'project') return 'Project Deadline';

  return 'Event';
}

function navigateToEventPage(event) {
  if (!event) return;

  if (event.type === 'task' && event.taskId) {
    navigateToTask({ id: event.taskId, projectId: event.projectId });
  } else if (event.type === 'project' && event.projectId) {
    navigateToProject(event.projectId);
  } else if (event.type === 'campaign' && event.campaignId) {
    router.push({ name: 'campaign-detail', params: { id: event.campaignId } });
  }
}

// ============================================================
// Lifecycle
// ============================================================
onMounted(async () => {
  loading.value = true;

  try {
    if (projects.value.length === 0) {
      await projectStore.fetchProjects();
    }

    if (clients.value.length === 0) {
      await clientStore.fetchClients();
    }

    await Promise.all([
      taskStore.fetchTasks(),
      loadEventsForCurrentView(),
      fetchTasks()
    ]);
  } catch (err) {
    console.error('Error initializing calendar:', err);
  } finally {
    loading.value = false;
  }
});
</script>
