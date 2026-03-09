import apiService from './api.service'
import type { Notification } from '@/types/models'

const NOTIFICATION_ENDPOINT = '/.netlify/functions/notifications'

export default {
  getNotifications(params: Record<string, unknown> = {}): Promise<Notification[]> {
    return apiService.get<Notification[]>(NOTIFICATION_ENDPOINT, params)
  },
  markAsRead(id: string): Promise<unknown> {
    return apiService.put(`${NOTIFICATION_ENDPOINT}/${id}`, { read: true })
  },
  markAllAsRead(): Promise<unknown> {
    return apiService.put(`${NOTIFICATION_ENDPOINT}?action=markAllRead`, {})
  },
  deleteNotification(id: string): Promise<void> {
    return apiService.delete(`${NOTIFICATION_ENDPOINT}/${id}`) as Promise<void>
  }
}
