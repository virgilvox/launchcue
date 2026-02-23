import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import notificationService from '../services/notification.service'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  const fetchNotifications = async (params = {}) => {
    isLoading.value = true
    error.value = null
    try {
      const response = await notificationService.getNotifications(params)
      notifications.value = response || []
      return notifications.value
    } catch (err) {
      error.value = err.message || 'Failed to fetch notifications'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const markAsRead = async (id) => {
    try {
      const updated = await notificationService.markAsRead(id)
      const index = notifications.value.findIndex(n => n.id === id)
      if (index !== -1) {
        notifications.value[index] = { ...notifications.value[index], read: true }
      }
      return updated
    } catch (err) {
      error.value = err.message || 'Failed to mark notification as read'
      throw err
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      notifications.value = notifications.value.map(n => ({ ...n, read: true }))
    } catch (err) {
      error.value = err.message || 'Failed to mark all notifications as read'
      throw err
    }
  }

  const deleteNotification = async (id) => {
    try {
      await notificationService.deleteNotification(id)
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch (err) {
      error.value = err.message || 'Failed to delete notification'
      throw err
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
    deleteNotification
  }
})
