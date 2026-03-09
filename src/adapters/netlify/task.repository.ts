import type { Task } from '@/types/models'
import type { TaskCreateRequest, TaskUpdateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { TASK_ENDPOINT } from '@/services/api.service'

export class NetlifyTaskRepository implements Repository<Task, TaskCreateRequest, TaskUpdateRequest> {
  async findAll(filter: QueryFilter = {}): Promise<Task[]> {
    const response = await apiService.get<Task[] | unknown>(TASK_ENDPOINT, filter as Record<string, unknown>)
    return Array.isArray(response) ? response : []
  }

  async findById(id: string): Promise<Task> {
    return apiService.get<Task>(`${TASK_ENDPOINT}/${id}`)
  }

  async create(data: TaskCreateRequest): Promise<Task> {
    return apiService.post<Task>(TASK_ENDPOINT, data)
  }

  async update(id: string, data: Partial<TaskUpdateRequest>): Promise<Task> {
    return apiService.put<Task>(`${TASK_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${TASK_ENDPOINT}/${id}`)
  }
}
