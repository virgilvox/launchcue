import type { Campaign } from '@/types/models'
import type { CampaignCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { CAMPAIGN_ENDPOINT } from '@/services/api.service'

export class NetlifyCampaignRepository implements Repository<Campaign, CampaignCreateRequest, Partial<CampaignCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Campaign[]> {
    return apiService.get<Campaign[]>(CAMPAIGN_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Campaign> {
    return apiService.get<Campaign>(`${CAMPAIGN_ENDPOINT}/${id}`)
  }

  async create(data: CampaignCreateRequest): Promise<Campaign> {
    return apiService.post<Campaign>(CAMPAIGN_ENDPOINT, data)
  }

  async update(id: string, data: Partial<CampaignCreateRequest>): Promise<Campaign> {
    return apiService.put<Campaign>(`${CAMPAIGN_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${CAMPAIGN_ENDPOINT}/${id}`)
  }
}
