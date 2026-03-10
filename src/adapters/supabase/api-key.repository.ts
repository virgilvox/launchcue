import type { ApiKey } from '@/types/models'
import type { ApiKeyCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseApiKeyRepository extends SupabaseBaseRepository<ApiKey, ApiKeyCreateRequest, Partial<ApiKey>> {
  constructor() {
    super('api_keys', 'active_api_keys', {
      keyHash: 'key_hash',
      userId: 'user_id',
      teamId: 'team_id',
      lastUsedAt: 'last_used_at',
      expiresAt: 'expires_at',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): ApiKey {
    return {
      id: row.id as string,
      name: row.name as string,
      prefix: row.prefix as string,
      scopes: (row.scopes as ApiKey['scopes']) || [],
      userId: row.user_id as string,
      teamId: row.team_id as string,
      createdAt: row.created_at as string,
      lastUsedAt: row.last_used_at as string | null,
      expiresAt: row.expires_at as string | null,
    }
  }
}
