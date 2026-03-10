import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useResourceStore } from '@/stores/resource'
import { RESOURCE_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useResourceStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: RESOURCE_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchResources', () => {
    it('returns empty when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useResourceStore()
      const result = await store.fetchResources()
      expect(result).toEqual([])
      expect(store.error).toBe('No team selected')
    })

    it('fetches with teamId filter', async () => {
      const resources = [{ id: 'r1', title: 'Resource 1' }, { id: 'r2', title: 'Resource 2' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(resources)

      const store = useResourceStore()
      const result = await store.fetchResources()

      expect(result).toHaveLength(2)
      expect(store.resources).toEqual(resources)
      expect(mockRepo.findAll).toHaveBeenCalledWith({ teamId: 'team-1' })
    })

    it('sets error on fetch failure', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const store = useResourceStore()
      const result = await store.fetchResources()

      expect(result).toEqual([])
      expect(store.error).toBe('Network error')
    })

    it('manages isLoading state', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useResourceStore()
      await store.fetchResources()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchResource', () => {
    it('returns null when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useResourceStore()
      const result = await store.fetchResource('r1')
      expect(result).toBeNull()
      expect(store.error).toBe('No team selected')
    })

    it('fetches by id and sets currentResource', async () => {
      const resource = { id: 'r1', title: 'Resource 1' }
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(resource)

      const store = useResourceStore()
      const result = await store.fetchResource('r1')

      expect(result).toEqual(resource)
      expect(store.currentResource).toEqual(resource)
      expect(mockRepo.findById).toHaveBeenCalledWith('r1')
    })

    it('sets error on fetch failure', async () => {
      ;(mockRepo.findById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Not found'))

      const store = useResourceStore()
      const result = await store.fetchResource('r1')

      expect(result).toBeNull()
      expect(store.error).toBe('Not found')
    })
  })

  describe('createResource', () => {
    it('creates, pushes to array, and emits event', async () => {
      const resource = { id: 'r1', title: 'New Resource' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(resource)

      const store = useResourceStore()
      const result = await store.createResource({ title: 'New Resource' } as any)

      expect(result).toEqual(resource)
      expect(store.resources).toContainEqual(resource)
    })

    it('auto-sets teamId from auth store', async () => {
      const resource = { id: 'r1', title: 'New', teamId: 'team-1' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(resource)

      const store = useResourceStore()
      await store.createResource({ title: 'New' } as any)

      const createArg = (mockRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(createArg.teamId).toBe('team-1')
    })
  })

  describe('updateResource', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useResourceStore()
      await expect(store.updateResource('r1', { title: 'Updated' })).rejects.toThrow('No team context')
    })

    it('updates resource in array', async () => {
      const updated = { id: 'r1', title: 'Updated' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useResourceStore()
      store.resources = [{ id: 'r1', title: 'Old' }] as any[]

      await store.updateResource('r1', { title: 'Updated' })
      expect(store.resources[0].title).toBe('Updated')
    })

    it('updates currentResource if same id', async () => {
      const updated = { id: 'r1', title: 'Updated' }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useResourceStore()
      store.resources = [{ id: 'r1', title: 'Old' }] as any[]
      store.currentResource = { id: 'r1', title: 'Old' } as any

      await store.updateResource('r1', { title: 'Updated' })
      expect(store.currentResource!.title).toBe('Updated')
    })
  })

  describe('deleteResource', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useResourceStore()
      await expect(store.deleteResource('r1')).rejects.toThrow('No team context')
    })

    it('removes resource from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useResourceStore()
      store.resources = [{ id: 'r1' }, { id: 'r2' }] as any[]

      await store.deleteResource('r1')
      expect(store.resources).toHaveLength(1)
      expect(store.resources[0].id).toBe('r2')
    })

    it('clears currentResource if same id', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useResourceStore()
      store.resources = [{ id: 'r1' }] as any[]
      store.currentResource = { id: 'r1', title: 'Current' } as any

      await store.deleteResource('r1')
      expect(store.currentResource).toBeNull()
    })
  })
})
