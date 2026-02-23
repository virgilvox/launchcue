import apiService from './api.service'

const WEBHOOK_ENDPOINT = '/.netlify/functions/webhooks'

export default {
  getWebhooks() {
    return apiService.get(WEBHOOK_ENDPOINT)
  },
  createWebhook(data) {
    return apiService.post(WEBHOOK_ENDPOINT, data)
  },
  updateWebhook(id, data) {
    return apiService.put(`${WEBHOOK_ENDPOINT}/${id}`, data)
  },
  deleteWebhook(id) {
    return apiService.delete(`${WEBHOOK_ENDPOINT}/${id}`)
  },
}
