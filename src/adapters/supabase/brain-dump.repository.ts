import type { BrainDump } from '@/types/models'
import type { BrainDumpCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'
import { getSupabase } from './client'

export class SupabaseBrainDumpRepository extends SupabaseBaseRepository<BrainDump, BrainDumpCreateRequest, Partial<BrainDump>> {
  constructor() {
    super('brain_dumps', 'brain_dumps', { // No soft delete, no active_ view
      clientId: 'client_id',
      projectId: 'project_id',
      teamId: 'team_id',
      userId: 'user_id',
    })
  }

  async delete(id: string): Promise<void> {
    // Brain dumps use hard delete (no soft delete columns)
    const { error } = await getSupabase()
      .from(this.tableName)
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  protected mapFromDb(row: Record<string, unknown>): BrainDump {
    return {
      id: row.id as string,
      title: row.title as string,
      content: row.content as string | undefined,
      tags: (row.tags as string[]) || [],
      clientId: row.client_id as string | null,
      projectId: row.project_id as string | null,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }

  async getContextData(params: Record<string, unknown>): Promise<unknown> {
    const sb = getSupabase()
    let options: Record<string, unknown> = {}
    if (typeof params.options === 'string') {
      try { options = JSON.parse(params.options) } catch { /* malformed options ignored */ }
    } else if (params.options) {
      options = params.options as Record<string, unknown>
    }
    const clientId = params.clientId as string | undefined
    const projectId = params.projectId as string | undefined

    const result: Record<string, unknown> = {}

    if (options.includeClients !== false && clientId) {
      const { data } = await sb.from('active_clients').select('*').eq('id', clientId).single()
      result.clientInfo = data
    }

    if (options.includeProjects !== false && projectId) {
      const { data } = await sb.from('active_projects').select('*').eq('id', projectId).single()
      result.projectInfo = data
    }

    if (options.includeTasks !== false) {
      let query = sb.from('active_tasks').select('title, status, due_date')
      if (clientId && !projectId) {
        // Tasks don't have client_id — find via projects linked to this client
        const { data: clientProjects } = await sb
          .from('active_projects')
          .select('id')
          .eq('client_id', clientId)
        const projectIds = (clientProjects || []).map((p: Record<string, unknown>) => p.id as string)
        if (projectIds.length > 0) {
          query = query.in('project_id', projectIds)
        } else {
          result.tasks = []
        }
      }
      if (projectId) query = query.eq('project_id', projectId)
      if (!result.tasks) {
        const { data } = await query.limit(50)
        result.tasks = data || []
      }
    }

    if (options.includeNotes !== false) {
      let query = sb.from('active_notes').select('title, content')
      if (clientId) query = query.eq('client_id', clientId)
      if (projectId) query = query.eq('project_id', projectId)
      const { data } = await query.limit(30)
      result.notes = data || []
    }

    if (options.includeCampaigns !== false) {
      let query = sb.from('active_campaigns').select('title, status, start_date, end_date')
      if (clientId) query = query.eq('client_id', clientId)
      if (projectId) query = query.eq('project_id', projectId)
      const { data } = await query.limit(20)
      result.campaigns = data || []
    }

    if (options.includeCalendar !== false) {
      const now = new Date().toISOString()
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      let query = sb.from('active_calendar_events').select('title, start_time, end_time, description')
        .gte('start_time', now)
        .lte('start_time', thirtyDays)
      if (clientId) query = query.eq('client_id', clientId)
      if (projectId) query = query.eq('project_id', projectId)
      const { data } = await query.limit(30)
      result.calendarEvents = data || []
    }

    return result
  }

  // Entity-specific field maps for createItems (brain dump's own map is wrong for other entities)
  private static readonly taskFieldMap: Record<string, string> = {
    projectId: 'project_id', assigneeId: 'assignee_id', parentTaskId: 'parent_task_id',
    dueDate: 'due_date', timeEstimate: 'time_estimate', timeSpent: 'time_spent',
    teamId: 'team_id', createdBy: 'created_by',
  }
  private static readonly eventFieldMap: Record<string, string> = {
    start: 'start_time', end: 'end_time', allDay: 'all_day',
    clientId: 'client_id', projectId: 'project_id', taskId: 'task_id',
    teamId: 'team_id', userId: 'user_id',
  }
  private static readonly projectFieldMap: Record<string, string> = {
    clientId: 'client_id', startDate: 'start_date', dueDate: 'due_date',
    ownerId: 'owner_id', teamId: 'team_id', createdBy: 'created_by',
  }

  private mapToDbWith(dto: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined || key === 'id') continue
      const column = fieldMap[key] || key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)
      result[column] = value
    }
    return result
  }

  async createItems(payload: Record<string, unknown>): Promise<unknown> {
    const sb = getSupabase()
    const results: Record<string, number> = { taskCount: 0, eventCount: 0, projectCount: 0 }

    // Resolve team_id from the current user's metadata
    const { data: { user } } = await sb.auth.getUser()
    const teamId = user?.user_metadata?.current_team_id
    if (!teamId) throw new Error('No team context available')

    const tasks = payload.tasks as Array<Record<string, unknown>> | undefined
    if (tasks?.length) {
      const rows = tasks.map(t => ({ ...this.mapToDbWith(t, SupabaseBrainDumpRepository.taskFieldMap), team_id: teamId }))
      const { data, error } = await sb.from('tasks').insert(rows).select()
      if (error) throw new Error(error.message)
      results.taskCount = data?.length || 0
    }

    const events = payload.events as Array<Record<string, unknown>> | undefined
    if (events?.length) {
      const rows = events.map(e => ({ ...this.mapToDbWith(e, SupabaseBrainDumpRepository.eventFieldMap), team_id: teamId }))
      const { data, error } = await sb.from('calendar_events').insert(rows).select()
      if (error) throw new Error(error.message)
      results.eventCount = data?.length || 0
    }

    const projects = payload.projects as Array<Record<string, unknown>> | undefined
    if (projects?.length) {
      const rows = projects.map(p => ({ ...this.mapToDbWith(p, SupabaseBrainDumpRepository.projectFieldMap), team_id: teamId }))
      const { data, error } = await sb.from('projects').insert(rows).select()
      if (error) throw new Error(error.message)
      results.projectCount = data?.length || 0
    }

    return { results }
  }
}
