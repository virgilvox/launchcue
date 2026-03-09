import type { Note } from '@/types/models'
import type { NoteCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { NOTE_ENDPOINT } from '@/services/api.service'

export class NetlifyNoteRepository implements Repository<Note, NoteCreateRequest, Partial<NoteCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<Note[]> {
    return apiService.get<Note[]>(NOTE_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<Note> {
    return apiService.get<Note>(`${NOTE_ENDPOINT}/${id}`)
  }

  async create(data: NoteCreateRequest): Promise<Note> {
    return apiService.post<Note>(NOTE_ENDPOINT, data)
  }

  async update(id: string, data: Partial<NoteCreateRequest>): Promise<Note> {
    return apiService.put<Note>(`${NOTE_ENDPOINT}/${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${NOTE_ENDPOINT}/${id}`)
  }
}
