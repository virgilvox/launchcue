import type { Task } from '@/types/models'
import type { TaskCreateRequest, TaskUpdateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseTaskRepository extends SupabaseBaseRepository<Task, TaskCreateRequest, TaskUpdateRequest> {
  constructor() {
    super('tasks', 'active_tasks', {
      projectId: 'project_id',
      assigneeId: 'assignee_id',
      parentTaskId: 'parent_task_id',
      dueDate: 'due_date',
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
