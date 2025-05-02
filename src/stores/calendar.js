import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import calendarService from '../services/calendar.service';
import { useAuthStore } from './auth';
import { useProjectStore } from './project';
import { useTaskStore } from './task';
import { useToast } from '../composables/useToast';

export const useCalendarStore = defineStore('calendar', () => {
  const authStore = useAuthStore();
  const projectStore = useProjectStore();
  const taskStore = useTaskStore();
  const toast = useToast();
  
  const events = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // Fetch calendar events for a date range
  async function fetchEvents(startDate, endDate) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      // Convert dates to ISO strings if they are Date objects
      const start = startDate instanceof Date ? startDate.toISOString() : startDate;
      const end = endDate instanceof Date ? endDate.toISOString() : endDate;
      
      const data = await calendarService.getEvents(start, end);
      
      // Process calendar events to ensure they have the correct format
      const processedEvents = data.map(event => {
        // Determine the event type first
        const eventType = event.type || determineEventType(event);
        
        // For project events, ensure they have proper titles
        let title = event.title;
        if (eventType === 'project' && event.projectId && (!title || title === 'project')) {
          // Try to find the project to get its name
          const project = projectStore.projects.find(p => p.id === event.projectId);
          if (project) {
            title = project.name || project.title || 'Project Deadline';
          } else {
            title = 'Project Deadline'; // Default if project not found
          }
        }
        
        return {
          ...event,
          start: event.start ? new Date(event.start) : null,
          end: event.end ? new Date(event.end) : null,
          // Ensure color is set
          color: event.color || getDefaultColor(event),
          // Ensure each event has a type
          type: eventType,
          // Use the updated title if available
          title: title || event.title || 'Event'
        };
      });
      
      events.value = processedEvents;
      return { success: true, events: processedEvents };
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      error.value = err.message || 'Failed to fetch calendar events';
      toast.error('Failed to fetch calendar events');
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }
  
  // Helper function to determine event type based on event properties
  function determineEventType(event) {
    if (event.type) return event.type;
    if (event.taskId) return 'task';
    if (event.projectId && !event.taskId) return 'project';
    return 'event';
  }
  
  // Helper function to get default color based on event type
  function getDefaultColor(event) {
    if (event.taskId) return 'blue';
    if (event.projectId && !event.taskId) return 'orange';
    return 'green';
  }

  // Create a new calendar event
  async function createEvent(eventData) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const data = await calendarService.createEvent({
        ...eventData,
        teamId: authStore.currentTeam.id
      });
      
      // Add the new event to the store
      events.value.push({
        ...data,
        start: data.start ? new Date(data.start) : null,
        end: data.end ? new Date(data.end) : null
      });
      
      toast.success('Event created successfully');
      return { success: true, event: data };
    } catch (err) {
      console.error('Error creating calendar event:', err);
      error.value = err.message || 'Failed to create calendar event';
      toast.error('Failed to create calendar event');
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Update an existing calendar event
  async function updateEvent(id, eventData) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const data = await calendarService.updateEvent(id, eventData);
      
      // Update the event in the store
      const index = events.value.findIndex(e => e.id === id);
      if (index !== -1) {
        events.value[index] = {
          ...data,
          start: data.start ? new Date(data.start) : null,
          end: data.end ? new Date(data.end) : null
        };
      }
      
      toast.success('Event updated successfully');
      return { success: true, event: data };
    } catch (err) {
      console.error('Error updating calendar event:', err);
      error.value = err.message || 'Failed to update calendar event';
      toast.error('Failed to update calendar event');
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Delete a calendar event
  async function deleteEvent(id) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      await calendarService.deleteEvent(id);
      
      // Remove the event from the store
      events.value = events.value.filter(e => e.id !== id);
      
      toast.success('Event deleted successfully');
      return { success: true };
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      error.value = err.message || 'Failed to delete calendar event';
      toast.error('Failed to delete calendar event');
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }

  // Get upcoming items combining events, tasks with due dates, and projects with deadlines
  async function getUpcomingItems(daysAhead = 7) {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' };
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      // Create date range
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      
      // Fetch events for the date range
      await fetchEvents(startDate, endDate);
      
      // Process tasks with due dates
      let upcomingTasks = [];
      if (taskStore.tasks.length > 0) {
        upcomingTasks = taskStore.tasks
          .filter(task => {
            if (!task.dueDate || task.status === 'Done') return false;
            const dueDate = new Date(task.dueDate);
            return dueDate >= startDate && dueDate <= endDate;
          })
          .map(task => ({
            id: task.id,
            title: task.title,
            date: new Date(task.dueDate),
            type: 'task',
            description: task.description || 'Task due date',
            projectId: task.projectId,
            taskId: task.id,
            color: 'blue'
          }));
      }
      
      // Process projects with deadlines
      let upcomingProjects = [];
      if (projectStore.projects.length > 0) {
        upcomingProjects = projectStore.projects
          .filter(project => {
            if (!project.dueDate) return false;
            const dueDate = new Date(project.dueDate);
            return dueDate >= startDate && dueDate <= endDate;
          })
          .map(project => ({
            id: project.id,
            title: project.name || project.title || 'Project Deadline',
            date: new Date(project.dueDate),
            type: 'project',
            description: 'Project deadline',
            projectId: project.id,
            taskId: null,
            color: 'orange'
          }));
      }
      
      // Map calendar events to the same format
      const formattedEvents = events.value.map(event => ({
        id: event.id,
        title: event.title,
        date: event.start,
        type: determineEventType(event),
        description: event.description || 'Calendar event',
        projectId: event.projectId,
        taskId: event.taskId,
        color: event.color || getDefaultColor(event)
      }));
      
      // Combine all items and sort by date
      const allItems = [...upcomingTasks, ...upcomingProjects, ...formattedEvents]
        .sort((a, b) => a.date - b.date);
      
      return { success: true, items: allItems };
    } catch (err) {
      console.error('Error fetching upcoming items:', err);
      error.value = err.message || 'Failed to fetch upcoming items';
      toast.error('Failed to fetch upcoming items');
      return { success: false, error: error.value, items: [] };
    } finally {
      isLoading.value = false;
    }
  }

  // Method to get tasks with deadlines for a specific date range
  async function getTaskDeadlines(startDate, endDate) {
    isLoading.value = true;
    error.value = null;
    
    try {
      // Use the calendar service to fetch task deadlines
      const data = await calendarService.getTaskDeadlines(startDate, endDate);
      
      // Log what we received for debugging
      console.log('Task deadlines received:', Array.isArray(data) ? `${data.length} tasks` : typeof data);
      
      // Ensure we have an array
      if (!data || !Array.isArray(data)) {
        console.warn('getTaskDeadlines in store: Expected array but got', typeof data);
        return [];
      }
      
      // Process tasks to ensure they have the correct format
      const processedTasks = data.map(task => {
        // Make sure each task has required properties
        const processedTask = {
          id: task.id || `task-${Math.random().toString(36).substr(2, 9)}`,
          title: task.title || task.name || 'Task',
          status: task.status || 'To Do',
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          description: task.description || '',
          projectId: task.projectId || null,
          projectName: task.projectName || null,
          // Add additional properties as needed
        };
        
        // Add status color
        processedTask.statusColor = getTaskStatusColor(processedTask.status);
        
        return processedTask;
      });
      
      return processedTasks;
    } catch (err) {
      console.error('Error fetching task deadlines:', err);
      error.value = err.message || 'Failed to fetch task deadlines';
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  // Helper function to get color based on task status
  function getTaskStatusColor(status) {
    if (!status) return 'gray';
    
    switch(status.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'green';
      case 'in progress':
        return 'blue';
      case 'to do':
        return 'yellow';
      case 'blocked':
        return 'red';
      default:
        return 'gray';
    }
  }

  return {
    events,
    isLoading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getUpcomingItems,
    getTaskDeadlines
  };
}); 