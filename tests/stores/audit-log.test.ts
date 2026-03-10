import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuditLogStore } from '@/stores/audit-log'
import { AUDIT_LOG_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useAuditLogStore', () => {
  let mockRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockRepo = createMockRepository()
    setupStoreTest([{ key: AUDIT_LOG_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  describe('fetchLogs', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useAuditLogStore()
      const result = await store.fetchLogs()
      expect(result).toEqual([])
    })

    it('fetches and stores audit logs', async () => {
      const logs = [
        { id: 'log-1', action: 'task.created', actorId: 'user-1', createdAt: '2024-01-01' },
        { id: 'log-2', action: 'project.updated', actorId: 'user-2', createdAt: '2024-01-02' },
      ]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(logs)

      const store = useAuditLogStore()
      const result = await store.fetchLogs()

      expect(result).toHaveLength(2)
      expect(store.logs).toEqual(logs)
      expect(mockRepo.findAll).toHaveBeenCalled()
    })

    it('passes params to findAll', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const store = useAuditLogStore()
      await store.fetchLogs({ action: 'task.created', limit: 50 })

      expect(mockRepo.findAll).toHaveBeenCalledWith({ action: 'task.created', limit: 50 })
    })

    it('clears logs and throws on error', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

      const store = useAuditLogStore()
      store.logs = [{ id: 'log-1' }] as any[]

      await expect(store.fetchLogs()).rejects.toThrow('Network error')
      expect(store.logs).toEqual([])
    })
  })
})
