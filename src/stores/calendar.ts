import { defineStore } from 'pinia'
import { ref } from 'vue'
import calendarService from '../services/calendar.service'
import { useAuthStore } from './auth'
import { useProjectStore } from './project'
import { useTaskStore } from './task'
import { useToast } from 'vue-toastification'
import type { CalendarEvent, Task, Project } from '../types/models'

// Processed event with Date objects instead of strings
interface ProcessedCalendarEvent extends Omit<CalendarEvent, 'start' | 'end'> {
  start: Date | null
  end: Date | null
  type: string
}

// Upcoming item shape (unified across events, tasks, projects)
interface UpcomingItem {
  id: string
  title: string
  date: Date | null
  type: string
  description: string
  projectId: string | null | undefined
  taskId: string | null | undefined
  color: string
}

// Processed task deadline shape
interface ProcessedTaskDeadline {
  id: string
  title: string
  status: string
  dueDate: Date | null
  description: string
  projectId: string | null
  projectName: string | null
  statusColor: string
}

// Store result type
interface CalendarStoreResult<T = undefined> {
  success: boolean
  error?: string
  events?: ProcessedCalendarEvent[]
  event?: CalendarEvent
  items?: UpcomingItem[]
}

export const useCalendarStore = defineStore('calendar', () => {
  const authStore = useAuthStore()
  const projectStore = useProjectStore()
  const taskStore = useTaskStore()
  const toast = useToast()

  const events = ref<ProcessedCalendarEvent[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Fetch calendar events for a date range
  async function fetchEvents(startDate: Date | string, endDate: Date | string): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      // Convert dates to ISO strings if they are Date objects
      const start = startDate instanceof Date ? startDate.toISOString() : startDate
      const end = endDate instanceof Date ? endDate.toISOString() : endDate

      const data: CalendarEvent[] = await calendarService.getEvents(start, end)

      // Process calendar events to ensure they have the correct format
      const processedEvents: ProcessedCalendarEvent[] = data.map(event => {
        // Determine the event type first
        const eventType = (event as ProcessedCalendarEvent).type || determineEventType(event)

        // For project events, ensure they have proper titles
        let title = event.title
        if (eventType === 'project' && event.projectId && (!title || title === 'project')) {
          // Try to find the project to get its name
          const project = projectStore.projects.find(p => p.id === event.projectId)
          if (project) {
            title = project.title || 'Project Deadline'
          } else {
            title = 'Project Deadline' // Default if project not found
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
        } as ProcessedCalendarEvent
      })

      events.value = processedEvents
      return { success: true, events: processedEvents }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch calendar events'
      error.value = message
      toast.error('Failed to fetch calendar events')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Helper function to determine event type based on event properties
  function determineEventType(event: Partial<CalendarEvent & { type?: string }>): string {
    if (event.taskId) return 'task'
    if (event.projectId && !event.taskId) return 'project'
    return 'event'
  }

  // Helper function to get default color based on event type
  function getDefaultColor(event: Partial<CalendarEvent>): string {
    if (event.taskId) return 'blue'
    if (event.projectId && !event.taskId) return 'orange'
    return 'green'
  }

  // Create a new calendar event
  async function createEvent(eventData: Record<string, unknown>): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      const data: CalendarEvent = await calendarService.createEvent({
        ...eventData,
        teamId: authStore.currentTeam.id
      })

      // Add the new event to the store
      events.value.push({
        ...data,
        start: data.start ? new Date(data.start) : null,
        end: data.end ? new Date(data.end) : null,
        type: determineEventType(data)
      } as ProcessedCalendarEvent)

      toast.success('Event created successfully')
      return { success: true, event: data }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create calendar event'
      error.value = message
      toast.error('Failed to create calendar event')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Update an existing calendar event
  async function updateEvent(id: string, eventData: Record<string, unknown>): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      const data: CalendarEvent = await calendarService.updateEvent(id, eventData)

      // Update the event in the store
      const index = events.value.findIndex(e => e.id === id)
      if (index !== -1) {
        events.value[index] = {
          ...data,
          start: data.start ? new Date(data.start) : null,
          end: data.end ? new Date(data.end) : null,
          type: determineEventType(data)
        } as ProcessedCalendarEvent
      }

      toast.success('Event updated successfully')
      return { success: true, event: data }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update calendar event'
      error.value = message
      toast.error('Failed to update calendar event')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Delete a calendar event
  async function deleteEvent(id: string): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      await calendarService.deleteEvent(id)

      // Remove the event from the store
      events.value = events.value.filter(e => e.id !== id)

      toast.success('Event deleted successfully')
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete calendar event'
      error.value = message
      toast.error('Failed to delete calendar event')
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Get upcoming items combining events, tasks with due dates, and projects with deadlines
  async function getUpcomingItems(daysAhead: number = 7): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    isLoading.value = true
    error.value = null

    try {
      // Create date range
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysAhead)

      // Fetch events for the date range
      await fetchEvents(startDate, endDate)

      // Process tasks with due dates
      let upcomingTasks: UpcomingItem[] = []
      if (taskStore.tasks.length > 0) {
        upcomingTasks = taskStore.tasks
          .filter(task => {
            if (!task.dueDate || task.status === 'Done') return false
            const dueDate = new Date(task.dueDate)
            return dueDate >= startDate && dueDate <= endDate
          })
          .map(task => ({
            id: task.id,
            title: task.title,
            date: new Date(task.dueDate!),
            type: 'task' as const,
            description: task.description || 'Task due date',
            projectId: task.projectId,
            taskId: task.id,
            color: 'blue'
          }))
      }

      // Process projects with deadlines
      let upcomingProjects: UpcomingItem[] = []
      if (projectStore.projects.length > 0) {
        upcomingProjects = projectStore.projects
          .filter(project => {
            if (!project.dueDate) return false
            const dueDate = new Date(project.dueDate)
            return dueDate >= startDate && dueDate <= endDate
          })
          .map(project => ({
            id: project.id,
            title: project.title || 'Project Deadline',
            date: new Date(project.dueDate!),
            type: 'project' as const,
            description: 'Project deadline',
            projectId: project.id,
            taskId: null,
            color: 'orange'
          }))
      }

      // Map calendar events to the same format
      const formattedEvents: UpcomingItem[] = events.value.map(event => ({
        id: event.id,
        title: event.title,
        date: event.start,
        type: event.type || determineEventType(event),
        description: event.description || 'Calendar event',
        projectId: event.projectId,
        taskId: event.taskId,
        color: event.color || getDefaultColor(event)
      }))

      // Combine all items and sort by date
      const allItems = [...upcomingTasks, ...upcomingProjects, ...formattedEvents]
        .sort((a, b) => {
          const dateA = a.date ? a.date.getTime() : 0
          const dateB = b.date ? b.date.getTime() : 0
          return dateA - dateB
        })

      return { success: true, items: allItems }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch upcoming items'
      error.value = message
      toast.error('Failed to fetch upcoming items')
      return { success: false, error: error.value, items: [] }
    } finally {
      isLoading.value = false
    }
  }

  // Method to get tasks with deadlines for a specific date range
  async function getTaskDeadlines(startDate: string, endDate: string): Promise<ProcessedTaskDeadline[]> {
    isLoading.value = true
    error.value = null

    try {
      // Use the calendar service to fetch task deadlines
      const data: Array<Record<string, unknown>> = await calendarService.getTaskDeadlines(startDate, endDate)

      // Ensure we have an array
      if (!data || !Array.isArray(data)) {
        return []
      }

      // Process tasks to ensure they have the correct format
      const processedTasks: ProcessedTaskDeadline[] = data.map(task => {
        // Make sure each task has required properties
        const processedTask: ProcessedTaskDeadline = {
          id: (task.id as string) || `task-${Math.random().toString(36).substr(2, 9)}`,
          title: (task.title as string) || (task.name as string) || 'Task',
          status: (task.status as string) || 'To Do',
          dueDate: task.dueDate ? new Date(task.dueDate as string) : null,
          description: (task.description as string) || '',
          projectId: (task.projectId as string) || null,
          projectName: (task.projectName as string) || null,
          statusColor: ''
        }

        // Add status color
        processedTask.statusColor = getTaskStatusColor(processedTask.status)

        return processedTask
      })

      return processedTasks
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch task deadlines'
      error.value = message
      return []
    } finally {
      isLoading.value = false
    }
  }

  // Helper function to get color based on task status
  function getTaskStatusColor(status: string): string {
    if (!status) return 'gray'

    switch (status.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'green'
      case 'in progress':
        return 'blue'
      case 'to do':
        return 'yellow'
      case 'blocked':
        return 'red'
      default:
        return 'gray'
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
  }
})
