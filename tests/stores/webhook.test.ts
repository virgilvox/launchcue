import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWebhookStore } from '@/stores/webhook'
import { WEBHOOK_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useWebhookStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: WEBHOOK_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchWebhooks', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useWebhookStore()
      const result = await store.fetchWebhooks()
      expect(result).toEqual([])
    })

    it('fetches and stores webhooks', async () => {
      const webhooks = [
        { id: 'wh-1', url: 'https://example.com/hook1', events: ['task.created'] },
        { id: 'wh-2', url: 'https://example.com/hook2', events: ['project.updated'] },
      ]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(webhooks)

      const store = useWebhookStore()
      const result = await store.fetchWebhooks()

      expect(result).toHaveLength(2)
      expect(store.webhooks).toEqual(webhooks)
      expect(mockRepo.findAll).toHaveBeenCalled()
    })
  })

  describe('createWebhook', () => {
    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useWebhookStore()
      await expect(store.createWebhook({ url: 'https://test.com' } as any)).rejects.toThrow('No team context')
    })

    it('creates webhook and pushes to array', async () => {
      const newWebhook = { id: 'wh-3', url: 'https://example.com/hook3', events: ['task.created'] }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(newWebhook)

      const store = useWebhookStore()
      const result = await store.createWebhook({ url: 'https://example.com/hook3', events: ['task.created'] } as any)

      expect(result).toEqual(newWebhook)
      expect(store.webhooks).toContainEqual(newWebhook)
      expect(mockRepo.create).toHaveBeenCalled()
    })
  })

  describe('updateWebhook', () => {
    it('throws when webhook ID is missing', async () => {
      const store = useWebhookStore()
      await expect(store.updateWebhook('', { url: 'https://new.com' } as any)).rejects.toThrow('Webhook ID is required for updates')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useWebhookStore()
      await expect(store.updateWebhook('wh-1', { url: 'https://new.com' } as any)).rejects.toThrow('No team context')
    })

    it('updates webhook in array', async () => {
      const updated = { id: 'wh-1', url: 'https://updated.com/hook', events: ['task.created'] }
      ;(mockRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useWebhookStore()
      store.webhooks = [{ id: 'wh-1', url: 'https://example.com/hook1', events: ['task.created'] }] as any[]

      const result = await store.updateWebhook('wh-1', { url: 'https://updated.com/hook' } as any)

      expect(result).toEqual(updated)
      expect(store.webhooks[0].url).toBe('https://updated.com/hook')
    })
  })

  describe('deleteWebhook', () => {
    it('throws when webhook ID is missing', async () => {
      const store = useWebhookStore()
      await expect(store.deleteWebhook('')).rejects.toThrow('Webhook ID is required for deletion')
    })

    it('throws when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useWebhookStore()
      await expect(store.deleteWebhook('wh-1')).rejects.toThrow('No team context')
    })

    it('removes webhook from array', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useWebhookStore()
      store.webhooks = [
        { id: 'wh-1', url: 'https://example.com/hook1' },
        { id: 'wh-2', url: 'https://example.com/hook2' },
      ] as any[]

      await store.deleteWebhook('wh-1')

      expect(store.webhooks).toHaveLength(1)
      expect(store.webhooks[0].id).toBe('wh-2')
    })
  })
})
