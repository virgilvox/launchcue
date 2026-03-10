import type { Project } from '@/types/models'
import type { ProjectCreateRequest, ProjectUpdateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseProjectRepository extends SupabaseBaseRepository<Project, ProjectCreateRequest, ProjectUpdateRequest> {
  constructor() {
    super('projects', 'active_projects', {
      clientId: 'client_id',
      startDate: 'start_date',
      dueDate: 'due_date',
      ownerId: 'owner_id',
      teamId: 'team_id',
      createdBy: 'created_by',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as Project['status'],
      clientId: row.client_id as string,
      startDate: row.start_date as string | null,
      dueDate: row.due_date as string | null,
      tags: (row.tags as string[]) || [],
      budget: row.budget as number | null,
      goals: (row.goals as string[]) || [],
      ownerId: row.owner_id as string | undefined,
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      deletedAt: row.deleted_at as string | null,
      deletedBy: row.deleted_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
