import type { ScopeTemplate } from '@/types/models'
import type { ScopeTemplateCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { SCOPE_TEMPLATE_ENDPOINT } from '@/services/api.service'

export class NetlifyScopeTemplateRepository implements Repository<ScopeTemplate, ScopeTemplateCreateRequest, Partial<ScopeTemplateCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<ScopeTemplate[]> {
    return apiService.get<ScopeTemplate[]>(SCOPE_TEMPLATE_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<ScopeTemplate> {
    return apiService.get<ScopeTemplate>(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`)
  }

  async create(data: ScopeTemplateCreateRequest): Promise<ScopeTemplate> {
    return apiService.post<ScopeTemplate>(SCOPE_TEMPLATE_ENDPOINT, data)
  }

  async update(id: string, data: Partial<ScopeTemplateCreateRequest>): Promise<ScopeTemplate> {
    return apiService.put<ScopeTemplate>(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${SCOPE_TEMPLATE_ENDPOINT}/${id}`)
  }
}
