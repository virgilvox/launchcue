import type { Webhook } from '@/types/models'
import { SupabaseBaseRepository } from './base.repository'

/** Validate webhook URL: must be valid HTTPS URL (HTTP allowed in dev) */
function validateUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid webhook URL format')
  }
  const isDev = import.meta.env?.DEV ?? false
  if (parsed.protocol !== 'https:' && !(isDev && parsed.protocol === 'http:')) {
    throw new Error('Webhook URL must use HTTPS')
  }
}

export class SupabaseWebhookRepository extends SupabaseBaseRepository<Webhook, Partial<Webhook>, Partial<Webhook>> {
  constructor() {
    super('webhooks', 'active_webhooks', {
      teamId: 'team_id',
    })
  }

  async create(dto: Partial<Webhook>): Promise<Webhook> {
    if (dto.url) validateUrl(dto.url)
    // Auto-generate secret if not provided (DB column is NOT NULL with no default)
    if (!dto.secret) {
      const bytes = new Uint8Array(32)
      crypto.getRandomValues(bytes)
      dto.secret = 'whsec_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    }
    return super.create(dto)
  }

  async update(id: string, dto: Partial<Webhook>): Promise<Webhook> {
    if (dto.url) validateUrl(dto.url)
    return super.update(id, dto)
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
