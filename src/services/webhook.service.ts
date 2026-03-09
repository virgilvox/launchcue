import apiService from './api.service'
import type { Webhook } from '@/types/models'

const WEBHOOK_ENDPOINT = '/.netlify/functions/webhooks'

export default {
  getWebhooks(): Promise<Webhook[]> {
    return apiService.get<Webhook[]>(WEBHOOK_ENDPOINT)
  },
  createWebhook(data: Partial<Webhook>): Promise<Webhook> {
    return apiService.post<Webhook>(WEBHOOK_ENDPOINT, data)
  },
  updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook> {
    return apiService.put<Webhook>(`${WEBHOOK_ENDPOINT}/${id}`, data)
  },
  deleteWebhook(id: string): Promise<void> {
    return apiService.delete(`${WEBHOOK_ENDPOINT}/${id}`) as Promise<void>
  },
}
