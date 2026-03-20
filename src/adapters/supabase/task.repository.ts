import type { Task } from '@/types/models'
import type { TaskCreateRequest, TaskUpdateRequest } from '@/types/api'
import type { QueryFilter } from '../types'
import { SupabaseBaseRepository } from './base.repository'
import { getSupabase } from './client'

export class SupabaseTaskRepository extends SupabaseBaseRepository<Task, TaskCreateRequest, TaskUpdateRequest> {
  constructor() {
    super('tasks', 'active_tasks', {
      projectId: 'project_id',
      assigneeId: 'assignee_id',
      parentTaskId: 'parent_task_id',
      dueDate: 'due_date',
      completed: 'completed',
      completedAt: 'completed_at',
      timeEstimate: 'time_estimate',
      timeSpent: 'time_spent',
      teamId: 'team_id',
      createdBy: 'created_by',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    })
  }

  async findAll(filter: QueryFilter = {}): Promise<Task[]> {
    const sb = getSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = sb.from(this.viewName).select(this.getSelectColumns())

    const { startDate, endDate, hasDueDate, search, ...rest } = filter

    // Semantic date range filters mapped to due_date column
    if (startDate !== undefined && startDate !== null) {
      query = query.gte('due_date', startDate)
    }
    if (endDate !== undefined && endDate !== null) {
      query = query.lte('due_date', endDate)
    }
    if (hasDueDate) {
      query = query.not('due_date', 'is', null)
    }
    // Text search on title (no 'search' column exists)
    if (search) {
      query = query.ilike('title', `%${search}%`)
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

  protected mapFromDb(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as Task['status'],
      type: row.type as string | undefined,
      priority: row.priority as Task['priority'],
      projectId: row.project_id as string | null,
      assigneeId: row.assignee_id as string | null,
      parentTaskId: row.parent_task_id as string | null,
      dueDate: row.due_date as string | null,
      completed: row.completed as boolean | undefined,
      completedAt: row.completed_at as string | null,
      checklist: (row.checklist as Task['checklist']) || [],
      tags: (row.tags as string[]) || [],
      timeEstimate: row.time_estimate as number | undefined,
      timeSpent: row.time_spent as number | undefined,
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      deletedAt: row.deleted_at as string | null,
      deletedBy: row.deleted_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
