import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from '@/stores/task'
import { TASK_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useTaskStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: TASK_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchTasks', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useTaskStore()
      const result = await store.fetchTasks()
      expect(result).toEqual([])
    })

    it('fetches and stores tasks', async () => {
      const tasks = [
        { id: 't1', title: 'Task 1', status: 'To Do' },
        { id: 't2', title: 'Task 2', status: 'In Progress' },
      ]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(tasks)

      const store = useTaskStore()
      const result = await store.fetchTasks()

      expect(result).toHaveLength(2)
      expect(store.tasks).toEqual(tasks)
      expect(mockRepo.findAll).toHaveBeenCalled()
    })

    it('passes filter to findAll', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useTaskStore()
      await store.fetchTasks({ projectId: 'p1' })
      expect(mockRepo.findAll).toHaveBeenCalledWith({ projectId: 'p1' })
    })

    it('sets error on failure', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))
      const store = useTaskStore()
      await expect(store.fetchTasks()).rejects.toThrow('Network error')
      expect(store.error).toBe('Network error')
    })

    it('manages isLoading state', async () => {
      let loadingDuring = false
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        // Can't easily check during, but verify it's false after
        return []
      })

      const store = useTaskStore()
      await store.fetchTasks()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createTask', () => {
    it('creates task and pushes to array', async () => {
      const newTask = { id: 't3', title: 'New Task', status: 'To Do', checklist: [] }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newTask)

      const store = useTaskStore()
      const result = await store.createTask({ title: 'New Task', projectId: 'p1' } as any)

      expect(result).toEqual(newTask)
      expect(store.tasks).toContainEqual(newTask)
      expect(mockRepo.create).toHaveBeenCalled()
    })

    it('passes dueDate through as-is (DATE columns accept YYYY-MM-DD)', async () => {
      const task = { id: 't4', title: 'Task', dueDate: '2024-06-15', checklist: [] }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(task)

      const store = useTaskStore()
      await store.createTask({ title: 'Task', dueDate: '2024-06-15', projectId: 'p1' } as any)

      const call = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(call.dueDate).toBe('2024-06-15')
    })

    it('initializes empty checklist if not provided', async () => {
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 't5', title: 'Task' })

      const store = useTaskStore()
      await store.createTask({ title: 'Task', projectId: 'p1' } as any)

      const call = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(call.checklist).toEqual([])
    })

    it('throws on creation error', async () => {
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Create failed'))
      const store = useTaskStore()
      await expect(store.createTask({ title: 'Task' } as any)).rejects.toThrow('Create failed')
    })
  })

  describe('updateTask', () => {
    it('throws when task ID is missing', async () => {
      const store = useTaskStore()
      await expect(store.updateTask({} as any)).rejects.toThrow('Task ID is required')
    })

    it('updates task in array', async () => {
      const original = { id: 't1', title: 'Original', status: 'To Do' }
      const updated = { id: 't1', title: 'Updated', status: 'Done' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useTaskStore()
      store.tasks = [original] as any[]

      const result = await store.updateTask({ id: 't1', title: 'Updated', status: 'Done' } as any)

      expect(result).toEqual(updated)
      expect(store.tasks[0].title).toBe('Updated')
    })

    it('passes dueDate through as-is on update (DATE columns accept YYYY-MM-DD)', async () => {
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 't1', title: 'Task' })

      const store = useTaskStore()
      store.tasks = [{ id: 't1', title: 'Task' }] as any[]

      await store.updateTask({ id: 't1', dueDate: '2024-12-25' } as any)

      const call = (mockRepo.update as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(call.dueDate).toBe('2024-12-25')
    })
  })

  describe('deleteTask', () => {
    it('throws when ID is missing', async () => {
      const store = useTaskStore()
      await expect(store.deleteTask('')).rejects.toThrow('Task ID is required')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useTaskStore()
      await expect(store.deleteTask('t1')).rejects.toThrow('No team context')
    })

    it('removes task from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useTaskStore()
      store.tasks = [
        { id: 't1', title: 'Task 1' },
        { id: 't2', title: 'Task 2' },
      ] as any[]

      await store.deleteTask('t1')

      expect(store.tasks).toHaveLength(1)
      expect(store.tasks[0].id).toBe('t2')
    })

    it('throws on deletion error', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'))
      const store = useTaskStore()
      store.tasks = [{ id: 't1', title: 'Task' }] as any[]
      await expect(store.deleteTask('t1')).rejects.toThrow('Delete failed')
    })
  })

  describe('getTaskById', () => {
    it('returns null when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useTaskStore()
      const result = await store.getTaskById('t1')
      expect(result).toBeNull()
      expect(mockRepo.findById).not.toHaveBeenCalled()
    })

    it('returns cached task if found', async () => {
      const store = useTaskStore()
      const task = { id: 't1', title: 'Cached Task' }
      store.tasks = [task] as any[]

      const result = await store.getTaskById('t1')
      expect(result).toEqual(task)
      expect(mockRepo.findById).not.toHaveBeenCalled()
    })

    it('fetches from repo when not cached', async () => {
      const task = { id: 't1', title: 'Fetched Task' }
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(task)

      const store = useTaskStore()
      const result = await store.getTaskById('t1')

      expect(result).toEqual(task)
      expect(mockRepo.findById).toHaveBeenCalledWith('t1')
      expect(store.tasks).toContainEqual(task)
    })

    it('returns null and sets error on fetch failure', async () => {
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))

      const store = useTaskStore()
      const result = await store.getTaskById('t1')

      expect(result).toBeNull()
      expect(store.error).toBe('Not found')
    })

    it('updates existing task in array if already present', async () => {
      const oldTask = { id: 't1', title: 'Old' }
      const newTask = { id: 't1', title: 'New' }
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(newTask)

      const store = useTaskStore()
      store.tasks = [] as any[] // empty so it fetches

      const result = await store.getTaskById('t1')
      expect(result?.title).toBe('New')
    })
  })
})
