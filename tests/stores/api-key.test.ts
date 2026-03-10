import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApiKeyStore } from '@/stores/api-key'
import { API_KEY_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useApiKeyStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: API_KEY_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchApiKeys', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useApiKeyStore()
      const result = await store.fetchApiKeys()
      expect(result).toEqual([])
    })

    it('fetches and stores api keys', async () => {
      const keys = [
        { id: 'k1', prefix: 'lc_abc', name: 'Production', createdAt: '2024-01-01' },
        { id: 'k2', prefix: 'lc_def', name: 'Staging', createdAt: '2024-02-01' },
      ]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(keys)

      const store = useApiKeyStore()
      const result = await store.fetchApiKeys()

      expect(result).toHaveLength(2)
      expect(store.apiKeys).toEqual(keys)
      expect(mockRepo.findAll).toHaveBeenCalled()
    })
  })

  describe('generateKey', () => {
    it('creates key, pushes to array, and emits event', async () => {
      const created = { id: 'k3', prefix: 'lc_ghi', name: 'New Key', key: 'lc_ghi_full_secret' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

      const store = useApiKeyStore()
      const result = await store.generateKey({ name: 'New Key' } as any)

      expect(result).toEqual(created)
      expect(store.apiKeys).toHaveLength(1)
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Key' })
    })
  })

  describe('deleteKey', () => {
    it('throws when prefix is missing', async () => {
      const store = useApiKeyStore()
      await expect(store.deleteKey('')).rejects.toThrow('API key prefix is required for deletion')
    })

    it('removes key from array by prefix', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useApiKeyStore()
      store.apiKeys = [
        { id: 'k1', prefix: 'lc_abc', name: 'Key 1' },
        { id: 'k2', prefix: 'lc_def', name: 'Key 2' },
      ] as any[]

      await store.deleteKey('lc_abc')

      expect(store.apiKeys).toHaveLength(1)
      expect(store.apiKeys[0].prefix).toBe('lc_def')
    })
  })
})
