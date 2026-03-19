import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { NOTIFICATION_REPO } from '@/adapters/repository-keys'
import type { NotificationRepository } from '@/adapters/types'
import type { Notification } from '../types/models'
import { useAuthStore } from './auth'

// --- Cross-tab leader election constants ---
const LEADER_KEY = 'launchcue-notif-leader'
const DATA_KEY = 'launchcue-notif-data'
const HEARTBEAT_INTERVAL_MS = 30_000
const LEADER_TIMEOUT_MS = 90_000

interface LeaderClaim {
  tabId: string
  timestamp: number
}

function generateTabId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  // Pagination state
  const currentPage = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(50)

  // Leader election state
  const tabId = generateTabId()
  let storageListener: ((e: StorageEvent) => void) | null = null

  function getRepo() {
    return getContainer().resolve<NotificationRepository>(NOTIFICATION_REPO)
  }

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  // --- Leader election internals ---

  function readLeaderClaim(): LeaderClaim | null {
    try {
      const raw = localStorage.getItem(LEADER_KEY)
      if (!raw) return null
      return JSON.parse(raw) as LeaderClaim
    } catch {
      return null
    }
  }

  function isLeader(): boolean {
    const claim = readLeaderClaim()
    return claim !== null && claim.tabId === tabId
  }

  function isLeaderAlive(): boolean {
    const claim = readLeaderClaim()
    if (!claim) return false
    return Date.now() - claim.timestamp < LEADER_TIMEOUT_MS
  }

  function claimLeadership(): boolean {
    // Claim if no leader or leader has timed out
    if (!isLeaderAlive()) {
      const claim: LeaderClaim = { tabId, timestamp: Date.now() }
      localStorage.setItem(LEADER_KEY, JSON.stringify(claim))
      startHeartbeat()
      return true
    }
    return isLeader()
  }

  function releaseLeadership(): void {
    if (isLeader()) {
      localStorage.removeItem(LEADER_KEY)
    }
    stopHeartbeat()
  }

  function startHeartbeat(): void {
    stopHeartbeat()
    heartbeatInterval = setInterval(() => {
      if (isLeader()) {
        const claim: LeaderClaim = { tabId, timestamp: Date.now() }
        localStorage.setItem(LEADER_KEY, JSON.stringify(claim))
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  function stopHeartbeat(): void {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  /** Write notification data to localStorage so follower tabs can pick it up. */
  function broadcastNotifications(): void {
    try {
      const payload = {
        notifications: notifications.value,
        currentPage: currentPage.value,
        totalItems: totalItems.value,
        totalPages: totalPages.value,
        pageSize: pageSize.value,
        timestamp: Date.now()
      }
      localStorage.setItem(DATA_KEY, JSON.stringify(payload))
    } catch {
      // localStorage quota or serialization error — non-fatal
    }
  }

  /** Read notification data that the leader tab wrote to localStorage. */
  function loadNotificationsFromStorage(): void {
    try {
      const raw = localStorage.getItem(DATA_KEY)
      if (!raw) return
      const payload = JSON.parse(raw)
      if (Array.isArray(payload.notifications)) {
        notifications.value = payload.notifications
        currentPage.value = payload.currentPage ?? 1
        totalItems.value = payload.totalItems ?? payload.notifications.length
        totalPages.value = payload.totalPages ?? 1
        pageSize.value = payload.pageSize ?? 50
      }
    } catch {
      // Corrupt data — ignore
    }
  }

  function onStorageEvent(e: StorageEvent): void {
    if (e.key === DATA_KEY && !isLeader()) {
      // Another tab (the leader) updated notification data
      loadNotificationsFromStorage()
    }
    if (e.key === LEADER_KEY) {
      // Leader changed — if leader went away, try to claim
      if (!isLeaderAlive() && pollInterval) {
        claimLeadership()
      }
    }
  }

  // --- Public API (original signatures preserved) ---

  const fetchNotifications = async (
    pagination?: { page?: number; limit?: number }
  ): Promise<Notification[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    error.value = null
    try {
      const repo = getRepo()
      const page = pagination?.page ?? 1
      const limit = pagination?.limit ?? 50

      if (repo.getPaginated) {
        const result = await repo.getPaginated({ page, limit })
        notifications.value = result.data || []
        currentPage.value = result.page
        totalItems.value = result.total
        totalPages.value = result.totalPages
        pageSize.value = result.limit
      } else {
        const response = await repo.getAll()
        notifications.value = response || []
        totalItems.value = notifications.value.length
        totalPages.value = 1
        currentPage.value = 1
      }
      // Leader broadcasts fresh data so follower tabs update
      if (isLeader()) {
        broadcastNotifications()
      }
      return notifications.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch notifications'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await getRepo().markRead(id)
      const index = notifications.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notifications.value[index] = { ...notifications.value[index], read: true }
      }
      if (isLeader()) broadcastNotifications()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark notification as read'
      throw err
    }
  }

  const markAllAsRead = async (): Promise<void> => {
    try {
      await getRepo().markAllRead()
      notifications.value = notifications.value.map(n => ({ ...n, read: true }))
      if (isLeader()) broadcastNotifications()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      throw err
    }
  }

  const deleteNotification = async (id: string): Promise<void> => {
    try {
      await getRepo().delete(id)
      notifications.value = notifications.value.filter(n => n.id !== id)
      if (isLeader()) broadcastNotifications()
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete notification'
      throw err
    }
  }

  const startPolling = (intervalMs = 60000): void => {
    stopPolling()

    // Try to become leader
    const weAreLeader = claimLeadership()

    if (weAreLeader) {
      // Leader: poll the API and broadcast results
      fetchNotifications().catch(() => {})
      pollInterval = setInterval(() => {
        fetchNotifications().catch(() => {})
      }, intervalMs)
    } else {
      // Follower: seed from localStorage, then wait for storage events
      loadNotificationsFromStorage()
      // Set a poll interval that periodically checks if we should take over leadership
      pollInterval = setInterval(() => {
        if (!isLeaderAlive()) {
          // Leader died — claim and start real polling
          if (claimLeadership()) {
            // Restart as leader
            stopPolling()
            startPolling(intervalMs)
          }
        }
      }, intervalMs)
    }

    // Listen for cross-tab storage events (only fires for OTHER tabs' writes)
    if (!storageListener) {
      storageListener = onStorageEvent
      window.addEventListener('storage', storageListener)
    }
  }

  const stopPolling = (): void => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    releaseLeadership()
    if (storageListener) {
      window.removeEventListener('storage', storageListener)
      storageListener = null
    }
  }

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    currentPage,
    totalItems,
    totalPages,
    pageSize,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    startPolling,
    stopPolling
  }
})
