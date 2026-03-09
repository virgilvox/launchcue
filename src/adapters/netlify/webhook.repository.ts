import type { Webhook } from '@/types/models'
import type { Repository, QueryFilter } from '../types'
import apiService from '@/services/api.service'

const WEBHOOK_ENDPOINT = '/.netlify/functions/webhooks'

export class NetlifyWebhookRepository implements Repository<Webhook, Partial<Webhook>, Partial<Webhook>> {
  async findAll(_filter: QueryFilter = {}): Promise<Webhook[]> {
    return apiService.get<Webhook[]>(WEBHOOK_ENDPOINT)
  }

  async findById(id: string): Promise<Webhook> {
    return apiService.get<Webhook>(`${WEBHOOK_ENDPOINT}/${id}`)
  }

  async create(data: Partial<Webhook>): Promise<Webhook> {
    return apiService.post<Webhook>(WEBHOOK_ENDPOINT, data)
  }

  async update(id: string, data: Partial<Webhook>): Promise<Webhook> {
    return apiService.put<Webhook>(`${WEBHOOK_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${WEBHOOK_ENDPOINT}/${id}`)
  }
}
