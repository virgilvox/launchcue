import type { Notification } from '@/types/models'
import type { NotificationRepository } from '../types'
import apiService from '@/services/api.service'

const NOTIFICATION_ENDPOINT = '/.netlify/functions/notifications'

export class NetlifyNotificationRepository implements NotificationRepository {
  async getAll(): Promise<Notification[]> {
    return apiService.get<Notification[]>(NOTIFICATION_ENDPOINT)
  }

  async markRead(id: string): Promise<void> {
    await apiService.put(`${NOTIFICATION_ENDPOINT}/${id}`, { read: true })
  }

  async markAllRead(): Promise<void> {
    await apiService.put(`${NOTIFICATION_ENDPOINT}?action=markAllRead`)
  }
}
