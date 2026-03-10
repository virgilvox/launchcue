import type { Campaign } from '@/types/models'
import type { CampaignCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseCampaignRepository extends SupabaseBaseRepository<Campaign, CampaignCreateRequest, Partial<Campaign>> {
  constructor() {
    super('campaigns', 'active_campaigns', {
      clientId: 'client_id',
      projectId: 'project_id',
      startDate: 'start_date',
      endDate: 'end_date',
      teamId: 'team_id',
      userId: 'user_id',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Campaign {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      status: row.status as Campaign['status'],
      types: (row.types as string[]) || [],
      clientId: row.client_id as string | null,
      projectId: row.project_id as string | null,
      startDate: row.start_date as string | null,
      endDate: row.end_date as string | null,
      steps: (row.steps as Campaign['steps']) || [],
      budget: row.budget as number | undefined,
      metrics: row.metrics as Campaign['metrics'],
      teamId: row.team_id as string,
      userId: row.user_id as string,
      deletedAt: row.deleted_at as string | null,
      deletedBy: row.deleted_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
