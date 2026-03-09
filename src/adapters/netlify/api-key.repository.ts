import type { ApiKey } from '@/types/models'
import type { ApiKeyCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { API_KEY_ENDPOINT } from '@/services/api.service'

export class NetlifyApiKeyRepository implements Repository<ApiKey, ApiKeyCreateRequest, never> {
  async findAll(_filter: QueryFilter = {}): Promise<ApiKey[]> {
    return apiService.get<ApiKey[]>(API_KEY_ENDPOINT)
  }

  async findById(id: string): Promise<ApiKey> {
    return apiService.get<ApiKey>(`${API_KEY_ENDPOINT}/${id}`)
  }

  async create(data: ApiKeyCreateRequest): Promise<ApiKey> {
    return apiService.post<ApiKey>(API_KEY_ENDPOINT, data)
  }

  async update(_id: string, _data: never): Promise<ApiKey> {
    throw new Error('API keys cannot be updated')
  }

  async delete(prefix: string): Promise<void> {
    await apiService.delete(`${API_KEY_ENDPOINT}/${prefix}`)
  }
}
