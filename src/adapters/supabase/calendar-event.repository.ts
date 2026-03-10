import type { CalendarEvent } from '@/types/models'
import type { CalendarEventCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

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
