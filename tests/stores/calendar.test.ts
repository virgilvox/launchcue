import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCalendarStore } from '@/stores/calendar'
import { useAuthStore } from '@/stores/auth'
import { CALENDAR_EVENT_REPO, TASK_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

describe('useCalendarStore', () => {
  let mockCalendarRepo: ReturnType<typeof createMockRepository>
  let mockTaskRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockCalendarRepo = createMockRepository()
    mockTaskRepo = createMockRepository()
    setupStoreTest([
      { key: CALENDAR_EVENT_REPO, factory: () => mockCalendarRepo },
      { key: TASK_REPO, factory: () => mockTaskRepo },
    ])
    seedAuth()
  })

  describe('fetchEvents', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.fetchEvents(new Date(), new Date())
      expect(result.success).toBe(false)
    })

    it('fetches and processes events', async () => {
      const events = [
        { id: 'e1', title: 'Event 1', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
        { id: 'e2', title: 'Event 2', start: '2024-01-02T10:00:00Z', end: null, taskId: 't1' },
      ]
      ;(mockCalendarRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(events)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.fetchEvents('2024-01-01', '2024-01-31')

      expect(result.success).toBe(true)
      expect(store.events).toHaveLength(2)
      expect(store.events[0].start).toBeInstanceOf(Date)
    })

    it('determines event type correctly', async () => {
      const events = [
        { id: 'e1', title: 'Task Event', start: '2024-01-01', taskId: 't1' },
        { id: 'e2', title: 'Project Event', start: '2024-01-01', projectId: 'p1' },
        { id: 'e3', title: 'Plain Event', start: '2024-01-01' },
      ]
      ;(mockCalendarRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(events)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      await store.fetchEvents('2024-01-01', '2024-01-31')

      expect(store.events[0].type).toBe('task')
      expect(store.events[1].type).toBe('project')
      expect(store.events[2].type).toBe('event')
    })

    it('assigns default colors', async () => {
      const events = [
        { id: 'e1', title: 'T', start: '2024-01-01', taskId: 't1' },
        { id: 'e2', title: 'P', start: '2024-01-01', projectId: 'p1' },
        { id: 'e3', title: 'E', start: '2024-01-01' },
      ]
      ;(mockCalendarRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(events)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      await store.fetchEvents('2024-01-01', '2024-01-31')

      expect(store.events[0].color).toBe('blue')
      expect(store.events[1].color).toBe('orange')
      expect(store.events[2].color).toBe('green')
    })

    it('handles fetch error', async () => {
      ;(mockCalendarRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.fetchEvents('2024-01-01', '2024-01-31')

      expect(result.success).toBe(false)
      expect(store.error).toBe('Network error')
    })
  })

  describe('createEvent', () => {
    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.createEvent({})
      expect(result.success).toBe(false)
    })

    it('creates event and adds to array', async () => {
      const event = { id: 'e1', title: 'New', start: '2024-01-01' }
      ;(mockCalendarRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(event)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.createEvent({ title: 'New' })

      expect(result.success).toBe(true)
      expect(store.events).toHaveLength(1)
    })
  })

  describe('updateEvent', () => {
    it('updates event in array', async () => {
      const updated = { id: 'e1', title: 'Updated', start: '2024-01-01' }
      ;(mockCalendarRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      store.events = [{ id: 'e1', title: 'Old', start: new Date(), end: null, type: 'event' }] as any[]

      const result = await store.updateEvent('e1', { title: 'Updated' })
      expect(result.success).toBe(true)
      expect(store.events[0].title).toBe('Updated')
    })
  })

  describe('deleteEvent', () => {
    it('removes event from array', async () => {
      ;(mockCalendarRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      store.events = [{ id: 'e1' }, { id: 'e2' }] as any[]

      const result = await store.deleteEvent('e1')
      expect(result.success).toBe(true)
      expect(store.events).toHaveLength(1)
    })
  })

  describe('getTaskDeadlines', () => {
    it('fetches and processes task deadlines', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', status: 'To Do', dueDate: '2024-01-15' },
        { id: 't2', title: 'Task 2', status: 'Done', dueDate: '2024-01-20' },
      ]
      ;(mockTaskRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(tasks)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.getTaskDeadlines('2024-01-01', '2024-01-31')

      expect(result).toHaveLength(2)
      expect(result[0].statusColor).toBe('yellow') // To Do
      expect(result[1].statusColor).toBe('green')  // Done
    })

    it('returns empty on error', async () => {
      ;(mockTaskRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()
      const result = await store.getTaskDeadlines('2024-01-01', '2024-01-31')

      expect(result).toEqual([])
    })
  })

  describe('isLoading (concurrent safety)', () => {
    it('stays true during concurrent operations', async () => {
      let resolve1!: (v: any) => void
      let resolve2!: (v: any) => void
      ;(mockCalendarRepo.findAll as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => new Promise(r => { resolve1 = r }))
      ;(mockCalendarRepo.create as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => new Promise(r => { resolve2 = r }))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useCalendarStore()

      const p1 = store.fetchEvents('2024-01-01', '2024-01-31')
      const p2 = store.createEvent({ title: 'Test' })

      expect(store.isLoading).toBe(true)

      resolve1([])
      await p1
      expect(store.isLoading).toBe(true) // p2 still running

      resolve2({ id: 'e1', title: 'Test', start: '2024-01-01' })
      await p2
      expect(store.isLoading).toBe(false)
    })
  })
})
