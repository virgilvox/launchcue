import type { Scope } from '@/types/models'
import type { ScopeCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { SCOPE_ENDPOINT } from '@/services/api.service'

export class NetlifyScopeRepository implements Repository<Scope, ScopeCreateRequest, Partial<ScopeCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Scope[]> {
    return apiService.get<Scope[]>(SCOPE_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Scope> {
    return apiService.get<Scope>(`${SCOPE_ENDPOINT}/${id}`)
  }

  async create(data: ScopeCreateRequest): Promise<Scope> {
    return apiService.post<Scope>(SCOPE_ENDPOINT, data)
  }

  async update(id: string, data: Partial<ScopeCreateRequest>): Promise<Scope> {
    return apiService.put<Scope>(`${SCOPE_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${SCOPE_ENDPOINT}/${id}`)
  }
}
