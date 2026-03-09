import type { BrainDump } from '@/types/models'
import type { BrainDumpCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { BRAINDUMP_ENDPOINT } from '@/services/api.service'

export class NetlifyBrainDumpRepository implements Repository<BrainDump, BrainDumpCreateRequest, Partial<BrainDumpCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<BrainDump[]> {
    return apiService.get<BrainDump[]>(BRAINDUMP_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<BrainDump> {
    return apiService.get<BrainDump>(`${BRAINDUMP_ENDPOINT}/${id}`)
  }

  async create(data: BrainDumpCreateRequest): Promise<BrainDump> {
    return apiService.post<BrainDump>(BRAINDUMP_ENDPOINT, data)
  }

  async update(id: string, data: Partial<BrainDumpCreateRequest>): Promise<BrainDump> {
    return apiService.put<BrainDump>(`${BRAINDUMP_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BRAINDUMP_ENDPOINT}/${id}`)
  }
}
