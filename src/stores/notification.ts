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

  function getRepo() {
    return getContainer().resolve<NotificationRepository>(NOTIFICATION_REPO)
  }

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  const fetchNotifications = async (): Promise<Notification[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    error.value = null
    try {
      const response = await getRepo().getAll()
      notifications.value = response || []
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
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    startPolling,
    stopPolling
  }
})
