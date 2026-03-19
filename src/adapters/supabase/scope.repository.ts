import type { Scope } from '@/types/models'
import type { ScopeCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseScopeRepository extends SupabaseBaseRepository<Scope, ScopeCreateRequest, Partial<Scope>> {
  constructor() {
    super('scopes', 'active_scopes', {
      projectId: 'project_id',
      clientId: 'client_id',
      templateId: 'template_id',
      totalAmount: 'total_amount',
      revisionNotes: 'revision_notes',
      sentAt: 'sent_at',
      approvedAt: 'approved_at',
      teamId: 'team_id',
      createdBy: 'created_by',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Scope {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      projectId: row.project_id as string | null,
      clientId: row.client_id as string | null,
      templateId: row.template_id as string | null,
      deliverables: (row.deliverables as Scope['deliverables']) || [],
      terms: row.terms as string | undefined,
      totalAmount: Number(row.total_amount) || 0,
      status: row.status as Scope['status'],
      revisionNotes: row.revision_notes as string | null,
      sentAt: row.sent_at as string | null,
      approvedAt: row.approved_at as string | null,
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
