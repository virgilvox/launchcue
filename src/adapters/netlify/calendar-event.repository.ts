import type { CalendarEvent } from '@/types/models'
import type { CalendarEventCreateRequest } from '@/types/api'
import type { Repository, QueryFilter } from '../types'
import apiService, { CALENDAR_EVENT_ENDPOINT } from '@/services/api.service'

export class NetlifyCalendarEventRepository implements Repository<CalendarEvent, CalendarEventCreateRequest, Partial<CalendarEventCreateRequest>> {
  async findAll(filter: QueryFilter = {}): Promise<CalendarEvent[]> {
    return apiService.get<CalendarEvent[]>(CALENDAR_EVENT_ENDPOINT, filter as Record<string, unknown>)
  }

  async findById(id: string): Promise<CalendarEvent> {
    return apiService.get<CalendarEvent>(`${CALENDAR_EVENT_ENDPOINT}/${id}`)
  }

  async create(data: CalendarEventCreateRequest): Promise<CalendarEvent> {
    return apiService.post<CalendarEvent>(CALENDAR_EVENT_ENDPOINT, data)
  }

  async update(id: string, data: Partial<CalendarEventCreateRequest>): Promise<CalendarEvent> {
    return apiService.put<CalendarEvent>(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`, data)
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${CALENDAR_EVENT_ENDPOINT}?id=${id}`)
  }
}
