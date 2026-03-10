import type { Resource } from '@/types/models'
import type { ResourceCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseResourceRepository extends SupabaseBaseRepository<Resource, ResourceCreateRequest, Partial<Resource>> {
  constructor() {
    super('resources', 'active_resources', {
      teamId: 'team_id',
      createdBy: 'created_by',
      updatedBy: 'updated_by',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Resource {
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as string,
      url: row.url as string,
      description: row.description as string | undefined,
      tags: (row.tags as string[]) || [],
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
