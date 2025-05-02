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
        <!-- Month Navigation -->
        <div class="flex justify-between items-center mb-6">
          <button 
            @click="prevMonth" 
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-purple-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white">{{ formattedCurrentMonth }}</h3>
          
          <button 
            @click="nextMonth" 
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-purple-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
        
        <!-- Calendar Grid -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden">
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

// Current month and navigation
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

// Computed properties for filtering
const filteredProjects = computed(() => {
  if (!projects.value || !Array.isArray(projects.value)) return [];
  
  // Make sure we have valid project names
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
      // Find all projects for this client
      const clientProjects = filteredProjects.value.map(p => p.id);
      matchesClient = event.projectId && clientProjects.includes(event.projectId);
    }
    
    return matchesProject && matchesClient;
  }).map(event => {
    // Create a new object to avoid mutating the original event
    const newEvent = { ...event };
    
    // Ensure event has a proper title by adding project name if missing
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
      // Find all projects for this client
      const clientProjects = filteredProjects.value.map(p => p.id);
      matchesClient = task.projectId && clientProjects.includes(task.projectId);
    }
    
    return matchesProject && matchesClient;
  });
});

const formattedCurrentMonth = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { 
    month: 'long',
    year: 'numeric'
  });
});

function prevMonth() {
  const date = new Date(currentDate.value);
  date.setMonth(date.getMonth() - 1);
  currentDate.value = date;
}

function nextMonth() {
  const date = new Date(currentDate.value);
  date.setMonth(date.getMonth() + 1);
  currentDate.value = date;
}

function clearFilters() {
  filterClientId.value = null;
  filterProjectId.value = null;
}

// Generate calendar days for the current month
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  // Array to hold all calendar days
  const days = [];
  
  // Add days from previous month to fill the first row
  const daysFromPrevMonth = firstDay.getDay();
  const prevMonth = new Date(year, month, 0);
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    });
  }
  
  // Add days from current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, new Date())
    });
  }
  
  // Add days from next month to fill the last row
  const daysFromNextMonth = 7 - (days.length % 7 || 7);
  for (let i = 1; i <= daysFromNextMonth; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date())
    });
  }
  
  // Add one more row if less than 6 weeks
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

function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

function getDateInfo(date) {
  // Additional date info for the calendar cell
  return '';
}

// Format date for display
function formatDate(dateObj) {
  if (!dateObj) return '';
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

// When the current month changes, reload the calendar events
watch(currentDate, () => {
  loadEventsForCurrentMonth();
  fetchTasks();
}, { immediate: false });

// Watch for filter changes
watch([filterClientId, filterProjectId], () => {
  if (filterClientId.value && !filterProjectId.value) {
    // Filter projects based on client
    const clientProjects = projects.value.filter(p => p.clientId === filterClientId.value);
    if (clientProjects.length === 1) {
      // If there's only one project for this client, automatically select it
      filterProjectId.value = clientProjects[0].id;
    }
  }
});

// Load events for the current month view
async function loadEventsForCurrentMonth() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the month
  const lastDay = new Date(year, month + 1, 0);
  
  // Add buffer days to show events that span from previous/next months
  firstDay.setDate(firstDay.getDate() - 7);
  lastDay.setDate(lastDay.getDate() + 7);
  
  // Fetch events for this date range
  await calendarStore.fetchEvents(firstDay, lastDay);
  
  // Not needed - the filteredEvents computed property will handle this
  // instead of modifying events.value directly
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
    const year = currentDate.value.getFullYear();
    const month = currentDate.value.getMonth();
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();
    
    console.log(`Fetching tasks for date range: ${startDate} to ${endDate}`);
    
    // Get tasks from calendar store
    const tasksResponse = await calendarStore.getTaskDeadlines(startDate, endDate);
    
    console.log('Tasks response received:', tasksResponse ? 
      (Array.isArray(tasksResponse) ? `Array with ${tasksResponse.length} items` : typeof tasksResponse) : 
      'null or undefined');
    
    // Handle the response - should be an array from the store now
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

// Navigate to the appropriate page based on event type
function navigateToEvent(event) {
  // First check if the event is valid
  if (!event) {
    console.warn('Attempted to navigate to invalid event');
    return;
  }

  // Store the selected event
  selectedEvent.value = event;
  
  // Select the event to show details in the sidebar
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
  projectLinks.value = []; // Clear previous links/contacts
  projectContacts.value = [];

  if (selectedProjectId.value) {
    try {
      // First try to get the project from the store
      const project = projects.value.find(p => p.id === selectedProjectId.value);
      if (project) {
        // Use project data from store if available
        projectLinks.value = project.links || [];
        projectContacts.value = project.contacts || [];
        console.log('Found project in store:', project.name);
      } else {
        // If not in store, try to fetch from API
        try {
          // Ensure API endpoint is correctly formed
          const projectEndpoint = `/projects/${selectedProjectId.value}`;
          console.log('Fetching project details from API:', projectEndpoint);
          
          const response = await apiService.get(projectEndpoint);
          
          // Check if response is valid JSON object and not HTML
          if (response && typeof response === 'object' && !response.toString().includes('<!DOCTYPE html>')) {
            console.log('Received project details from API:', response.name || response.title);
            projectLinks.value = response.links || [];
            projectContacts.value = response.contacts || [];
            
            // Update project store with the fetched project to avoid future API calls
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
  
  // Try to find the project in the store first
  const project = projects.value.find(p => p.id === projectId);
  if (project) {
    return project.name || project.title || 'Project';
  }
  
  // If we have any event that references this project, use its title as a fallback
  const relatedEvent = events.value.find(e => e.projectId === projectId && e.title && e.title !== 'Project');
  if (relatedEvent && relatedEvent.title) {
    return relatedEvent.title;
  }
  
  // Try to get the project from tasks if available
  const relatedTask = tasks.value.find(t => t.projectId === projectId && t.projectName);
  if (relatedTask && relatedTask.projectName) {
    return relatedTask.projectName;
  }
  
  return 'Project';
}

function getEventTitle(event) {
  if (!event) return 'Untitled Event';
  
  // If it's a project event, ensure we get the project name
  if (event.type === 'project' && event.projectId) {
    const project = projects.value.find(p => p.id === event.projectId);
    if (project) {
      return project.name || project.title || 'Project Deadline';
    }
  }
  
  // Use the event title if available
  if (event.title && event.title !== 'project') {
    return event.title;
  }
  
  // Default fallbacks based on event type
  if (event.type === 'task') return 'Task';
  if (event.type === 'project') return 'Project Deadline';
  
  return 'Event';
}

// Add a new function to navigate to the event page when button is clicked
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

onMounted(async () => {
  loading.value = true;
  
  try {
    // Load initial data
    if (projects.value.length === 0) {
      await projectStore.fetchProjects();
    }
    
    if (clients.value.length === 0) {
      await clientStore.fetchClients();
    }
    
    // Load tasks and events for the current month
    await Promise.all([
      taskStore.fetchTasks(),
      loadEventsForCurrentMonth(),
      fetchTasks()
    ]);
  } catch (err) {
    console.error('Error initializing calendar:', err);
  } finally {
    loading.value = false;
  }
});
</script> 