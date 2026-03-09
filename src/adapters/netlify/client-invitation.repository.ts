import type { ClientInvitation } from '@/types/models'
import type { ClientInvitationCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { CLIENT_INVITATION_ENDPOINT } from '@/services/api.service'

export class NetlifyClientInvitationRepository implements Repository<ClientInvitation, ClientInvitationCreateRequest, Partial<ClientInvitationCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<ClientInvitation[]> {
    return apiService.get<ClientInvitation[]>(CLIENT_INVITATION_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<ClientInvitation> {
    return apiService.get<ClientInvitation>(`${CLIENT_INVITATION_ENDPOINT}/${id}`)
  }

  async create(data: ClientInvitationCreateRequest): Promise<ClientInvitation> {
    return apiService.post<ClientInvitation>(CLIENT_INVITATION_ENDPOINT, data)
  }

  async update(_id: string, _data: Partial<ClientInvitationCreateRequest>): Promise<ClientInvitation> {
    throw new Error('Client invitations cannot be updated')
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${CLIENT_INVITATION_ENDPOINT}/${id}`)
  }
}
