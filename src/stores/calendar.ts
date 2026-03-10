import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { CALENDAR_EVENT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import { useAuthStore } from './auth'
import { useProjectStore } from './project'
import { useTaskStore } from './task'
import { useToast } from 'vue-toastification'
import { useLoadingCounter } from '@/composables/useLoadingCounter'
import type { CalendarEvent, Task, Project } from '../types/models'
import type { CalendarEventCreateRequest } from '../types/api'

// Task deadlines: uses TASK_REPO to fetch tasks with due dates in range
import { TASK_REPO } from '@/adapters/repository-keys'

interface ProcessedCalendarEvent extends Omit<CalendarEvent, 'start' | 'end'> {
  start: Date | null
  end: Date | null
  type: string
}

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
  const { isLoading, wrap } = useLoadingCounter()

  const events = ref<ProcessedCalendarEvent[]>([])
  const error = ref<string | null>(null)

  function getRepo() {
    return getContainer().resolve<Repository<CalendarEvent, CalendarEventCreateRequest, Partial<CalendarEventCreateRequest>>>(CALENDAR_EVENT_REPO)
  }

  function determineEventType(event: Partial<CalendarEvent & { type?: string }>): string {
    if (event.taskId) return 'task'
    if (event.projectId && !event.taskId) return 'project'
    return 'event'
  }

  function getDefaultColor(event: Partial<CalendarEvent>): string {
    if (event.taskId) return 'blue'
    if (event.projectId && !event.taskId) return 'orange'
    return 'green'
  }

  async function fetchEvents(startDate: Date | string, endDate: Date | string): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const start = startDate instanceof Date ? startDate.toISOString() : startDate
        const end = endDate instanceof Date ? endDate.toISOString() : endDate

        const data = await getRepo().findAll({ startDate: start, endDate: end })

        const processedEvents: ProcessedCalendarEvent[] = data.map(event => {
          const eventType = (event as unknown as ProcessedCalendarEvent).type || determineEventType(event)

          let title = event.title
          if (eventType === 'project' && event.projectId && (!title || title === 'project')) {
            const project = projectStore.projects.find(p => p.id === event.projectId)
            if (project) {
              title = project.title || 'Project Deadline'
            } else {
              title = 'Project Deadline'
            }
          }

          return {
            ...(event as unknown as Record<string, unknown>),
            id: event.id,
            start: event.start ? new Date(event.start) : null,
            end: event.end ? new Date(event.end) : null,
            color: event.color || getDefaultColor(event),
            type: eventType,
            title: title || event.title || 'Event'
          } as ProcessedCalendarEvent
        })

        events.value = processedEvents
        return { success: true, events: processedEvents }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch calendar events'
        error.value = message
        return { success: false, error: error.value }
      }
    })
  }

  async function createEvent(eventData: Record<string, unknown>): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const data = await getRepo().create({
          ...eventData,
          teamId: authStore.currentTeam!.id
        } as unknown as CalendarEventCreateRequest)

        events.value.push({
          ...data,
          start: data.start ? new Date(data.start) : null,
          end: data.end ? new Date(data.end) : null,
          type: determineEventType(data)
        } as ProcessedCalendarEvent)

        getEventBus().emit('calendar-event.created', { event: data })
        toast.success('Event created successfully')
        return { success: true, event: data }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create calendar event'
        error.value = message
        toast.error('Failed to create calendar event')
        return { success: false, error: error.value }
      }
    })
  }

  async function updateEvent(id: string, eventData: Record<string, unknown>): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const data = await getRepo().update(id, eventData as Partial<CalendarEventCreateRequest>)

        const index = events.value.findIndex(e => e.id === id)
        if (index !== -1) {
          events.value[index] = {
            ...data,
            start: data.start ? new Date(data.start) : null,
            end: data.end ? new Date(data.end) : null,
            type: determineEventType(data)
          } as ProcessedCalendarEvent
        }

        getEventBus().emit('calendar-event.updated', { event: data })
        toast.success('Event updated successfully')
        return { success: true, event: data }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update calendar event'
        error.value = message
        toast.error('Failed to update calendar event')
        return { success: false, error: error.value }
      }
    })
  }

  async function deleteEvent(id: string): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        await getRepo().delete(id)
        events.value = events.value.filter(e => e.id !== id)

        getEventBus().emit('calendar-event.deleted', { id })
        toast.success('Event deleted successfully')
        return { success: true }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete calendar event'
        error.value = message
        toast.error('Failed to delete calendar event')
        return { success: false, error: error.value }
      }
    })
  }

  async function getUpcomingItems(daysAhead: number = 7): Promise<CalendarStoreResult> {
    if (!authStore.currentTeam) {
      return { success: false, error: 'No team selected' }
    }

    return wrap(async () => {
      error.value = null
      try {
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + daysAhead)

        await fetchEvents(startDate, endDate)

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

        const formattedEvents: UpcomingItem[] = events.value.map(event => ({
          id: event.id,
          title: event.title,
          date: event.start,
          type: event.type || determineEventType(event as unknown as Partial<CalendarEvent>),
          description: event.description || 'Calendar event',
          projectId: event.projectId,
          taskId: event.taskId,
          color: event.color || getDefaultColor(event as unknown as Partial<CalendarEvent>)
        }))

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
        return { success: false, error: error.value, items: [] }
      }
    })
  }

  async function getTaskDeadlines(startDate: string, endDate: string): Promise<ProcessedTaskDeadline[]> {
    if (!authStore.currentTeam) return []
    return wrap(async () => {
      error.value = null
      try {
        const taskRepo = getContainer().resolve<Repository<Task>>(TASK_REPO)
        const tasks = await taskRepo.findAll({ startDate, endDate, hasDueDate: true })

        if (!tasks || !Array.isArray(tasks)) {
          return []
        }

        const processedTasks: ProcessedTaskDeadline[] = tasks.map((task: unknown) => {
          const t = task as Record<string, unknown>
          const processedTask: ProcessedTaskDeadline = {
            id: (t.id as string) || `task-${Math.random().toString(36).substr(2, 9)}`,
            title: (t.title as string) || 'Task',
            status: (t.status as string) || 'To Do',
            dueDate: t.dueDate ? new Date(t.dueDate as string) : null,
            description: (t.description as string) || '',
            projectId: (t.projectId as string) || null,
            projectName: (t.projectName as string) || null,
            statusColor: ''
          }

          processedTask.statusColor = getTaskStatusColor(processedTask.status)

          return processedTask
        })

        return processedTasks
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch task deadlines'
        error.value = message
        return []
      }
    })
  }

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
