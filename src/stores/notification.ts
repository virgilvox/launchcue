import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { NOTIFICATION_REPO } from '@/adapters/repository-keys'
import type { NotificationRepository } from '@/adapters/types'
import type { Notification } from '../types/models'
import { useAuthStore } from './auth'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let pollInterval: ReturnType<typeof setInterval> | null = null

  // Pagination state
  const currentPage = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(50)

  function getRepo() {
    return getContainer().resolve<NotificationRepository>(NOTIFICATION_REPO)
  }

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

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
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark notification as read'
      throw err
    }
  }

  const markAllAsRead = async (): Promise<void> => {
    try {
      await getRepo().markAllRead()
      notifications.value = notifications.value.map(n => ({ ...n, read: true }))
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      throw err
    }
  }

  const deleteNotification = async (id: string): Promise<void> => {
    try {
      await getRepo().delete(id)
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to delete notification'
      throw err
    }
  }

  const startPolling = (intervalMs = 60000): void => {
    stopPolling()
    fetchNotifications().catch(() => {})
    pollInterval = setInterval(() => {
      fetchNotifications().catch(() => {})
    }, intervalMs)
  }

  const stopPolling = (): void => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
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
