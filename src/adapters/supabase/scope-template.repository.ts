import type { ScopeTemplate } from '@/types/models'
import type { ScopeTemplateCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseScopeTemplateRepository extends SupabaseBaseRepository<ScopeTemplate, ScopeTemplateCreateRequest, Partial<ScopeTemplate>> {
  constructor() {
    super('scope_templates', 'active_scope_templates', {
      teamId: 'team_id',
      createdBy: 'created_by',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): ScopeTemplate {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      deliverables: (row.deliverables as ScopeTemplate['deliverables']) || [],
      terms: row.terms as string | undefined,
      tags: (row.tags as string[]) || [],
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
