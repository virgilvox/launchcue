import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBrainDumpStore } from '@/stores/brain-dump'
import { BRAIN_DUMP_REPO, AI_ADAPTER } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useBrainDumpStore', () => {
  let mockRepo: any
  let mockAi: any

  beforeEach(() => {
    mockRepo = {
      ...createMockRepository(),
      getContextData: vi.fn().mockResolvedValue({}),
      createItems: vi.fn().mockResolvedValue({}),
    }
    mockAi = {
      process: vi.fn().mockResolvedValue({ result: 'processed' }),
    }
    setupStoreTest([
      { key: BRAIN_DUMP_REPO, factory: () => mockRepo },
      { key: AI_ADAPTER, factory: () => mockAi },
    ])
    seedAuth()
  })

  describe('fetchDumps', () => {
    it('returns empty when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useBrainDumpStore()
      const result = await store.fetchDumps()
      expect(result).toEqual([])
    })

    it('fetches and stores dumps', async () => {
      const dumps = [{ id: 'd1', content: 'Idea 1' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(dumps)

      const store = useBrainDumpStore()
      const result = await store.fetchDumps()
      expect(result).toEqual(dumps)
      expect(store.dumps).toEqual(dumps)
    })

    it('handles error', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useBrainDumpStore()
      await expect(store.fetchDumps()).rejects.toThrow('Failed')
      expect(store.dumps).toEqual([])
    })
  })

  describe('createDump', () => {
    it('creates and pushes to array', async () => {
      const dump = { id: 'd1', content: 'New idea' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(dump)

      const store = useBrainDumpStore()
      const result = await store.createDump({ content: 'New idea' } as any)
      expect(result).toEqual(dump)
      expect(store.dumps).toContainEqual(dump)
    })
  })

  describe('deleteDump', () => {
    it('throws when id is empty', async () => {
      const store = useBrainDumpStore()
      await expect(store.deleteDump('')).rejects.toThrow('Brain dump ID is required')
    })

    it('removes dump from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)
      const store = useBrainDumpStore()
      store.dumps = [{ id: 'd1' }, { id: 'd2' }] as any[]

      await store.deleteDump('d1')
      expect(store.dumps).toHaveLength(1)
      expect(store.dumps[0].id).toBe('d2')
    })
  })

  describe('processText', () => {
    it('calls AI adapter process', async () => {
      const store = useBrainDumpStore()
      const options = {
        prompt: 'test',
        processingDetails: { type: 'summarize', context: '', enriched: false },
        max_tokens: 1000,
      }
      const result = await store.processText(options)
      expect(result).toEqual({ result: 'processed' })
      expect(mockAi.process).toHaveBeenCalledWith(options)
    })

    it('manages isLoading during processing', async () => {
      const store = useBrainDumpStore()
      await store.processText({
        prompt: 'test',
        processingDetails: { type: 'summarize', context: '', enriched: false },
        max_tokens: 1000,
      })
      expect(store.isLoading).toBe(false)
    })
  })

  describe('getContextData', () => {
    it('calls repo getContextData', async () => {
      const store = useBrainDumpStore()
      await store.getContextData({ projectId: 'p1' })
      expect(mockRepo.getContextData).toHaveBeenCalledWith({ projectId: 'p1' })
    })
  })

  describe('createItems', () => {
    it('calls repo createItems', async () => {
      const store = useBrainDumpStore()
      await store.createItems({ items: [] })
      expect(mockRepo.createItems).toHaveBeenCalledWith({ items: [] })
    })
  })
})
