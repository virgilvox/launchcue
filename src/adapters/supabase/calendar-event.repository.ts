import type { CalendarEvent } from '@/types/models'
import type { CalendarEventCreateRequest } from '@/types/api'
import type { QueryFilter } from '../types'
import { SupabaseBaseRepository } from './base.repository'
import { getSupabase } from './client'

export class SupabaseCalendarEventRepository extends SupabaseBaseRepository<CalendarEvent, CalendarEventCreateRequest, Partial<CalendarEvent>> {
  constructor() {
    super('calendar_events', 'active_calendar_events', {
      start: 'start_time',
      end: 'end_time',
      allDay: 'all_day',
      clientId: 'client_id',
      projectId: 'project_id',
      taskId: 'task_id',
      teamId: 'team_id',
      userId: 'user_id',
    })
  }

  async findAll(filter: QueryFilter = {}): Promise<CalendarEvent[]> {
    const sb = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from(this.viewName).select(this.getSelectColumns())

    const { startDate, endDate, ...rest } = filter

    // Date range: include events that overlap the range (not just start within it)
    // An event overlaps [startDate, endDate] when event.start_time <= endDate AND event.end_time >= startDate
    if (startDate !== undefined && startDate !== null) {
      query = query.or(`end_time.gte.${startDate},and(end_time.is.null,start_time.gte.${startDate})`)
    }
    if (endDate !== undefined && endDate !== null) {
      query = query.lte('start_time', endDate)
    }

    // Apply remaining filters normally
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined || value === null) continue
      const column = this.toSnake(key)
      query = query.eq(column, value)
    }

    query = this.applyDefaultOrder(query)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyDefaultOrder(query: any): any {
    return query.order('start_time', { ascending: true })
  }

  protected mapFromDb(row: Record<string, unknown>): CalendarEvent {
    return {
      id: row.id as string,
      title: row.title as string,
      start: row.start_time as string,
      end: row.end_time as string | null,
      allDay: row.all_day as boolean,
      description: row.description as string | undefined,
      color: row.color as CalendarEvent['color'],
      clientId: row.client_id as string | null,
      projectId: row.project_id as string | null,
      taskId: row.task_id as string | null,
      recurrence: row.recurrence as CalendarEvent['recurrence'],
      reminders: (row.reminders as CalendarEvent['reminders']) || [],
      teamId: row.team_id as string,
      userId: row.user_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
