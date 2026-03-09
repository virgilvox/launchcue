import type { Resource } from '@/types/models'
import type { ResourceCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { RESOURCE_ENDPOINT } from '@/services/api.service'

export class NetlifyResourceRepository implements Repository<Resource, ResourceCreateRequest, Partial<ResourceCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Resource[]> {
    return apiService.get<Resource[]>(RESOURCE_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Resource> {
    return apiService.get<Resource>(`${RESOURCE_ENDPOINT}/${id}`)
  }

  async create(data: ResourceCreateRequest): Promise<Resource> {
    return apiService.post<Resource>(RESOURCE_ENDPOINT, data)
  }

  async update(id: string, data: Partial<ResourceCreateRequest>): Promise<Resource> {
    return apiService.put<Resource>(`${RESOURCE_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${RESOURCE_ENDPOINT}/${id}`)
  }
}
