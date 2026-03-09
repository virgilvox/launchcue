import type { Client } from '@/types/models'
import type { ClientCreateRequest, ClientUpdateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { CLIENT_ENDPOINT } from '@/services/api.service'

export class NetlifyClientRepository implements Repository<Client, ClientCreateRequest, ClientUpdateRequest> {
  async findAll(filter: QueryFilter = {}): Promise<Client[]> {
    return apiService.get<Client[]>(CLIENT_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Client> {
    return apiService.get<Client>(`${CLIENT_ENDPOINT}/${id}`)
  }

  async create(data: ClientCreateRequest): Promise<Client> {
    return apiService.post<Client>(CLIENT_ENDPOINT, data)
  }

  async update(id: string, data: Partial<ClientUpdateRequest>): Promise<Client> {
    return apiService.put<Client>(`${CLIENT_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${CLIENT_ENDPOINT}/${id}`)
  }
}
