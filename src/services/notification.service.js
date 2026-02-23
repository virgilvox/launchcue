import apiService from './api.service'

const NOTIFICATION_ENDPOINT = '/.netlify/functions/notifications'

export default {
  getNotifications(params = {}) {
    return apiService.get(NOTIFICATION_ENDPOINT, params)
  },
  markAsRead(id) {
    return apiService.put(`${NOTIFICATION_ENDPOINT}/${id}`, { read: true })
  },
  markAllAsRead() {
    return apiService.put(`${NOTIFICATION_ENDPOINT}?action=markAllRead`, {})
  },
  deleteNotification(id) {
    return apiService.delete(`${NOTIFICATION_ENDPOINT}/${id}`)
  }
}
