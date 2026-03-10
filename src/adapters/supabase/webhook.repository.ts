import type { Webhook } from '@/types/models'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseWebhookRepository extends SupabaseBaseRepository<Webhook, Partial<Webhook>, Partial<Webhook>> {
  constructor() {
    super('webhooks', 'active_webhooks', {
      teamId: 'team_id',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): Webhook {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      url: row.url as string,
      events: (row.events as string[]) || [],
      secret: row.secret as string,
      active: row.active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
