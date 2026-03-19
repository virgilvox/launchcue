import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useNotificationStore } from '@/stores/notification'
import { NOTIFICATION_REPO } from '@/adapters/repository-keys'
import { createMockNotificationRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useNotificationStore', () => {
  let mockRepo: ReturnType<typeof createMockNotificationRepository>

  beforeEach(() => {
    localStorage.clear()
    mockRepo = createMockNotificationRepository()
    setupStoreTest([{ key: NOTIFICATION_REPO, factory: () => mockRepo }])
    seedAuth()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('fetchNotifications', () => {
    it('returns empty array when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useNotificationStore()
      const result = await store.fetchNotifications()
      expect(result).toEqual([])
    })

    it('fetches and stores notifications', async () => {
      const notifications = [
        { id: 'n1', message: 'Hello', read: false },
        { id: 'n2', message: 'World', read: true },
      ]
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue(notifications)

      const store = useNotificationStore()
      const result = await store.fetchNotifications()

      expect(result).toHaveLength(2)
      expect(store.notifications).toEqual(notifications)
    })

    it('sets error on failure', async () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch failed'))
      const store = useNotificationStore()
      await expect(store.fetchNotifications()).rejects.toThrow('Fetch failed')
      expect(store.error).toBe('Fetch failed')
    })

    it('manages isLoading state', async () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useNotificationStore()
      await store.fetchNotifications()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const store = useNotificationStore()
      store.notifications = [
        { id: 'n1', message: 'Test', read: false },
      ] as any[]

      await store.markAsRead('n1')

      expect(mockRepo.markRead).toHaveBeenCalledWith('n1')
      expect(store.notifications[0].read).toBe(true)
    })

    it('throws and sets error on failure', async () => {
      ;(mockRepo.markRead as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Mark failed'))

      const store = useNotificationStore()
      store.notifications = [{ id: 'n1', read: false }] as any[]

      await expect(store.markAsRead('n1')).rejects.toThrow('Mark failed')
      expect(store.error).toBe('Mark failed')
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const store = useNotificationStore()
      store.notifications = [
        { id: 'n1', message: 'One', read: false },
        { id: 'n2', message: 'Two', read: false },
        { id: 'n3', message: 'Three', read: true },
      ] as any[]

      await store.markAllAsRead()

      expect(mockRepo.markAllRead).toHaveBeenCalled()
      expect(store.notifications.every(n => n.read)).toBe(true)
    })

    it('throws on failure', async () => {
      ;(mockRepo.markAllRead as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useNotificationStore()
      store.notifications = [{ id: 'n1', read: false }] as any[]
      await expect(store.markAllAsRead()).rejects.toThrow('Failed')
    })
  })

  describe('deleteNotification', () => {
    it('removes notification from array', async () => {
      const store = useNotificationStore()
      store.notifications = [
        { id: 'n1', message: 'One' },
        { id: 'n2', message: 'Two' },
      ] as any[]

      await store.deleteNotification('n1')

      expect(mockRepo.delete).toHaveBeenCalledWith('n1')
      expect(store.notifications).toHaveLength(1)
      expect(store.notifications[0].id).toBe('n2')
    })

    it('throws on failure', async () => {
      ;(mockRepo.delete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'))
      const store = useNotificationStore()
      store.notifications = [{ id: 'n1' }] as any[]
      await expect(store.deleteNotification('n1')).rejects.toThrow('Delete failed')
    })
  })

  describe('unreadCount', () => {
    it('counts unread notifications', () => {
      const store = useNotificationStore()
      store.notifications = [
        { id: 'n1', read: false },
        { id: 'n2', read: true },
        { id: 'n3', read: false },
      ] as any[]

      expect(store.unreadCount).toBe(2)
    })

    it('returns 0 when all are read', () => {
      const store = useNotificationStore()
      store.notifications = [
        { id: 'n1', read: true },
        { id: 'n2', read: true },
      ] as any[]

      expect(store.unreadCount).toBe(0)
    })

    it('returns 0 when empty', () => {
      const store = useNotificationStore()
      expect(store.unreadCount).toBe(0)
    })
  })

  describe('startPolling / stopPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('starts polling and fetches immediately', () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useNotificationStore()

      store.startPolling(5000)
      expect(mockRepo.getAll).toHaveBeenCalledTimes(1)
    })

    it('fetches on each interval tick', () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useNotificationStore()

      store.startPolling(5000)
      expect(mockRepo.getAll).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(5000)
      expect(mockRepo.getAll).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(5000)
      expect(mockRepo.getAll).toHaveBeenCalledTimes(3)
    })

    it('stopPolling clears interval', () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useNotificationStore()

      store.startPolling(5000)
      store.stopPolling()

      vi.advanceTimersByTime(10000)
      // Should only have the initial fetch, no more
      expect(mockRepo.getAll).toHaveBeenCalledTimes(1)
    })

    it('startPolling clears previous interval', () => {
      ;(mockRepo.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([])
      const store = useNotificationStore()

      store.startPolling(5000)
      store.startPolling(10000)

      vi.advanceTimersByTime(5000)
      // initial fetch x2 + no tick from first interval
      expect(mockRepo.getAll).toHaveBeenCalledTimes(2)
    })
  })
})
