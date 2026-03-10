import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProjectStore } from '@/stores/project'
import { PROJECT_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useProjectStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: PROJECT_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchProjects', () => {
    it('returns empty when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useProjectStore()
      const result = await store.fetchProjects()
      expect(result).toEqual([])
    })

    it('fetches and stores projects', async () => {
      const projects = [{ id: 'p1', title: 'Project 1' }, { id: 'p2', title: 'Project 2' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(projects)

      const store = useProjectStore()
      const result = await store.fetchProjects()

      expect(result).toHaveLength(2)
      expect(store.projects).toEqual(projects)
    })

    it('sets projects to empty on error', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useProjectStore()
      await expect(store.fetchProjects()).rejects.toThrow('Failed')
      expect(store.projects).toEqual([])
    })

    it('manages isLoading state', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useProjectStore()
      await store.fetchProjects()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchClientProjects', () => {
    it('throws when clientId is empty', async () => {
      const store = useProjectStore()
      await expect(store.fetchClientProjects('')).rejects.toThrow('Client ID is required')
    })

    it('fetches projects for a client', async () => {
      const projects = [{ id: 'p1', title: 'Client Project' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(projects)

      const store = useProjectStore()
      const result = await store.fetchClientProjects('c1')

      expect(result).toEqual(projects)
      expect(mockRepo.findAll).toHaveBeenCalledWith({ clientId: 'c1' })
    })
  })

  describe('getProject', () => {
    it('throws when id is empty', async () => {
      const store = useProjectStore()
      await expect(store.getProject('')).rejects.toThrow('Project ID is required')
    })

    it('fetches from repo', async () => {
      const project = { id: 'p1', title: 'Project' }
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(project)

      const store = useProjectStore()
      const result = await store.getProject('p1')
      expect(result).toEqual(project)
    })
  })

  describe('createProject', () => {
    it('creates and pushes to array', async () => {
      const project = { id: 'p1', title: 'New' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(project)

      const store = useProjectStore()
      const result = await store.createProject({ title: 'New' } as any)

      expect(result).toEqual(project)
      expect(store.projects).toContainEqual(project)
    })
  })

  describe('updateProject', () => {
    it('throws when id is empty', async () => {
      const store = useProjectStore()
      await expect(store.updateProject('', {})).rejects.toThrow('Project ID is required')
    })

    it('updates project in array', async () => {
      const updated = { id: 'p1', title: 'Updated' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useProjectStore()
      store.projects = [{ id: 'p1', title: 'Old' }] as any[]

      await store.updateProject('p1', { title: 'Updated' })
      expect(store.projects[0].title).toBe('Updated')
    })
  })

  describe('deleteProject', () => {
    it('throws when id is empty', async () => {
      const store = useProjectStore()
      await expect(store.deleteProject('')).rejects.toThrow('Project ID is required')
    })

    it('removes project from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useProjectStore()
      store.projects = [{ id: 'p1' }, { id: 'p2' }] as any[]

      await store.deleteProject('p1')
      expect(store.projects).toHaveLength(1)
      expect(store.projects[0].id).toBe('p2')
    })
  })

  describe('addProject', () => {
    it('returns undefined for null project', () => {
      const store = useProjectStore()
      expect(store.addProject(null as any)).toBeUndefined()
    })

    it('returns undefined for project without id', () => {
      const store = useProjectStore()
      expect(store.addProject({} as any)).toBeUndefined()
    })

    it('adds new project to array', () => {
      const store = useProjectStore()
      const project = { id: 'p1', title: 'New' } as any
      const result = store.addProject(project)
      expect(result).toEqual(project)
      expect(store.projects).toContainEqual(project)
    })

    it('updates existing project', () => {
      const store = useProjectStore()
      store.projects = [{ id: 'p1', title: 'Old' }] as any[]
      store.addProject({ id: 'p1', title: 'Updated' } as any)
      expect(store.projects[0].title).toBe('Updated')
    })
  })
})
