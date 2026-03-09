import type { Team } from '@/types/models'
import type { TeamCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { TEAM_ENDPOINT } from '@/services/api.service'

export class NetlifyTeamRepository implements Repository<Team, TeamCreateRequest, Partial<TeamCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Team[]> {
    return apiService.get<Team[]>(TEAM_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Team> {
    return apiService.get<Team>(`${TEAM_ENDPOINT}/${id}`)
  }

  async create(data: TeamCreateRequest): Promise<Team> {
    return apiService.post<Team>(TEAM_ENDPOINT, data)
  }

  async update(id: string, data: Partial<TeamCreateRequest>): Promise<Team> {
    return apiService.put<Team>(`${TEAM_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${TEAM_ENDPOINT}/${id}`)
  }
}
