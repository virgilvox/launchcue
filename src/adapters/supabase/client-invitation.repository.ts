import type { ClientInvitation } from '@/types/models'
import type { ClientInvitationCreateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseClientInvitationRepository extends SupabaseBaseRepository<ClientInvitation, ClientInvitationCreateRequest, Partial<ClientInvitation>> {
  constructor() {
    super('client_invitations', 'active_client_invitations', {
      teamId: 'team_id',
      clientId: 'client_id',
      projectIds: 'project_ids',
      invitedBy: 'invited_by',
      tokenHash: 'token_hash',
      expiresAt: 'expires_at',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): ClientInvitation {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      clientId: row.client_id as string,
      projectIds: (row.project_ids as string[]) || [],
      email: row.email as string,
      name: row.name as string,
      role: 'client',
      invitedBy: row.invited_by as string,
      token: row.token as string | undefined,
      status: row.status as ClientInvitation['status'],
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
