import type { Project } from '@/types/models'
import type { ProjectCreateRequest, ProjectUpdateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { PROJECT_ENDPOINT } from '@/services/api.service'

export class NetlifyProjectRepository implements Repository<Project, ProjectCreateRequest, ProjectUpdateRequest> {
  async findAll(filter: QueryFilter = {}): Promise<Project[]> {
    return apiService.get<Project[]>(PROJECT_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Project> {
    return apiService.get<Project>(`${PROJECT_ENDPOINT}/${id}`)
  }

  async create(data: ProjectCreateRequest): Promise<Project> {
    return apiService.post<Project>(PROJECT_ENDPOINT, data)
  }

  async update(id: string, data: Partial<ProjectCreateRequest>): Promise<Project> {
    return apiService.put<Project>(`${PROJECT_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${PROJECT_ENDPOINT}/${id}`)
  }
}
