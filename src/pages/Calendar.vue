<template>
  <PageContainer>
    <PageHeader title="Project Calendar View" />

    <!-- Filter controls -->
    <CalendarFilters
      :clients="clients"
      :projects="filteredProjects"
      :client-id="filterClientId"
      :project-id="filterProjectId"
      @update:client-id="filterClientId = $event"
      @update:project-id="filterProjectId = $event"
      @clear="clearFilters"
    />

    <div class="flex flex-1 space-x-6 mt-6">
      <!-- Calendar and Task List -->
      <div class="flex-1 flex flex-col">
        <!-- Navigation and View Toggle -->
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center space-x-2">
            <button
              @click="navigatePrev"
              class="p-2 hover:bg-[var(--surface)] transition-colors text-[var(--accent-primary)]"
              :aria-label="`Previous ${calendarView}`"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            <button
              @click="goToToday"
              class="px-3 py-1.5 text-sm font-medium bg-[var(--accent-primary-wash)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary-wash)] transition-colors"
            >
              Today
            </button>

            <button
              @click="navigateNext"
              class="p-2 hover:bg-[var(--surface)] transition-colors text-[var(--accent-primary)]"
              :aria-label="`Next ${calendarView}`"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>

            <h3 class="heading-section ml-2">{{ headerTitle }}</h3>
          </div>

          <!-- View Toggle Buttons -->
          <div class="flex overflow-hidden border-2 border-[var(--border-light)]">
            <button
              @click="calendarView = 'month'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors',
                calendarView === 'month'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface)]'
              ]"
            >
              Month
            </button>
            <button
              @click="calendarView = 'week'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors border-l-2 border-r-2 border-[var(--border-light)]',
                calendarView === 'week'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface)]'
              ]"
            >
              Week
            </button>
            <button
              @click="calendarView = 'day'"
              :class="[
                'px-4 py-1.5 text-sm font-medium transition-colors',
                calendarView === 'day'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface)]'
              ]"
            >
              Day
            </button>
          </div>
        </div>

        <!-- ==================== MONTH VIEW ==================== -->
        <CalendarMonthView
          v-if="calendarView === 'month'"
          :calendar-days="calendarDays"
          :days-of-week="daysOfWeek"
          :get-events-for-day="getEventsForDay"
          :get-event-title="getEventTitle"
          :get-date-info="getDateInfo"
          @select-event="navigateToEvent"
        />

        <!-- ==================== WEEK VIEW ==================== -->
        <CalendarWeekView
          v-if="calendarView === 'week'"
          :week-days="weekDays"
          :week-hours="weekHours"
          :has-all-day-events-in-week="hasAllDayEventsInWeek"
          :get-all-day-events-for-day="getAllDayEventsForDay"
          :get-timed-events-for-day-hour="getTimedEventsForDayHour"
          :get-week-event-style="getWeekEventStyle"
          :get-event-title="getEventTitle"
          :format-hour="formatHour"
          :format-event-time="formatEventTime"
          @select-event="navigateToEvent"
        />

        <!-- ==================== DAY VIEW ==================== -->
        <CalendarDayView
          v-if="calendarView === 'day'"
          :day-view-header="dayViewHeader"
          :day-all-day-events="dayAllDayEvents"
          :day-hours="dayHours"
          :current-date="currentDate"
          :get-timed-events-for-day-view-hour="getTimedEventsForDayViewHour"
          :get-day-event-style="getDayEventStyle"
          :get-event-title="getEventTitle"
          :format-hour="formatHour"
          :format-event-time="formatEventTime"
          @select-event="navigateToEvent"
        />

        <!-- Task List -->
        <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-4">
          <h4 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Task List</h4>

          <div v-if="loading || eventsLoading" class="py-4 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[var(--accent-primary)] border-t-transparent"></div>
            <p class="mt-2 text-[var(--text-secondary)]">Loading tasks...</p>
          </div>

          <div v-else-if="filteredTasks.length === 0" class="py-4 text-center text-[var(--text-primary)]">
            No tasks found for this period.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="flex items-center justify-between p-3 hover:bg-[var(--surface)] transition-colors cursor-pointer"
              @click="navigateToTask(task)"
            >
              <div class="flex items-center">
                <div :class="['w-2 h-2 rounded-full mr-3', getStatusDotBg(task.statusColor)]"></div>
                <span class="text-[var(--text-primary)]">{{ task.title }}</span>
              </div>
              <div class="flex items-center text-sm text-[var(--text-primary)]">
                <span>{{ task.status }}</span>
                <span class="mx-2">&bull;</span>
                <span>{{ formatShortDate(task.dueDate) }}</span>
                <svg class="h-5 w-5 ml-2 text-[var(--text-secondary)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Event Details Sidebar -->
      <CalendarEventSidebar
        :selected-event="selectedEvent"
        :project-name="selectedEventProjectName"
        :project-links="projectLinks"
        :project-contacts="projectContacts"
        :get-event-title="getEventTitle"
        :format-date="formatShortDate"
        @navigate-to-event="navigateToEventPage"
      />
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useCalendarStore } from '../stores/calendar';
import { useProjectStore } from '../stores/project';
import { useTaskStore } from '../stores/task';
import { useClientStore } from '../stores/client';
import apiService from '../services/api.service';
import { formatShortDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import CalendarFilters from '@/components/calendar/CalendarFilters.vue';
import CalendarMonthView from '@/components/calendar/CalendarMonthView.vue';
import CalendarWeekView from '@/components/calendar/CalendarWeekView.vue';
import CalendarDayView from '@/components/calendar/CalendarDayView.vue';
import CalendarEventSidebar from '@/components/calendar/CalendarEventSidebar.vue';

const router = useRouter();
const toast = useToast();
const calendarStore = useCalendarStore();
const projectStore = useProjectStore();
const taskStore = useTaskStore();
const clientStore = useClientStore();
const { getProjectName } = useEntityLookup();

const projects = computed(() => projectStore.projects);
const clients = computed(() => clientStore.clients);
const tasks = ref([]);

const statusColorMap = {
  blue: 'bg-[#3B82F6]',
  green: 'bg-[#22C55E]',
  red: 'bg-[#EF4444]',
  orange: 'bg-[#F97316]',
  purple: 'bg-[#8B5CF6]',
  yellow: 'bg-[#EAB308]',
  pink: 'bg-[#EC4899]',
  indigo: 'bg-[#6366F1]',
  gray: 'bg-[#6B7280]',
};
const getStatusDotBg = (color) => statusColorMap[color] || 'bg-[var(--accent-primary)]';

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

// Computed project name for selected event (used by sidebar)
const selectedEventProjectName = computed(() => {
  if (!selectedEvent.value || !selectedEvent.value.projectId) return 'Project';
  return getProjectName(selectedEvent.value.projectId);
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

    const tasksResponse = await calendarStore.getTaskDeadlines(startDate, endDate);

    if (Array.isArray(tasksResponse)) {
      tasks.value = tasksResponse;
    } else {
      tasks.value = [];
    }
  } catch (err) {
    toast.error('Failed to load tasks');
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

// ============================================================
// Event interaction
// ============================================================

function navigateToEvent(event) {
  if (!event) {
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
      } else {
        try {
          const projectEndpoint = `/projects/${selectedProjectId.value}`;
          const response = await apiService.get(projectEndpoint);

          if (response && typeof response === 'object' && !response.toString().includes('<!DOCTYPE html>')) {
            projectLinks.value = response.links || [];
            projectContacts.value = response.contacts || [];

            if (!projects.value.some(p => p.id === selectedProjectId.value)) {
              projectStore.addProject(response);
            }
          }
        } catch (apiError) {
          toast.error('Failed to load event details');
        }
      }
    } catch (err) {
      toast.error('Failed to load event details');
    }
  }
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

    const results = await Promise.allSettled([
      taskStore.fetchTasks(),
      loadEventsForCurrentView(),
      fetchTasks()
    ]);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        toast.error('Failed to load calendar data. Please try again.');
      }
    });
  } catch (err) {
    toast.error('Failed to load calendar');
  } finally {
    loading.value = false;
  }
});
</script>
