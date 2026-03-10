import type { BrainDump } from '@/types/models'
import type { BrainDumpCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

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
    const { error } = await (await import('./client')).getSupabase()
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
}
