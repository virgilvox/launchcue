import type { Client } from '@/types/models'
import type { ClientCreateRequest, ClientUpdateRequest } from '@/types/api'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseClientRepository extends SupabaseBaseRepository<Client, ClientCreateRequest, ClientUpdateRequest> {
  constructor() {
    super('clients', 'active_clients', {
      contactName: 'contact_name',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
      teamId: 'team_id',
      createdBy: 'created_by',
    })
  }

  protected getSelectColumns(): string {
    return '*, client_contacts(*)'
  }

  protected mapFromDb(row: Record<string, unknown>): Client {
    const contacts = (row.client_contacts as Record<string, unknown>[]) || []
    return {
      id: row.id as string,
      name: row.name as string,
      industry: row.industry as string | undefined,
      website: row.website as string | undefined,
      description: row.description as string | undefined,
      contactName: row.contact_name as string | undefined,
      contactEmail: row.contact_email as string | undefined,
      contactPhone: row.contact_phone as string | undefined,
      address: row.address as string | undefined,
      notes: row.notes as string | undefined,
      color: row.color as string | undefined,
      contacts: contacts.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        email: c.email as string | undefined,
        phone: c.phone as string | undefined,
        role: c.role as string | undefined,
        isPrimary: c.is_primary as boolean,
        notes: c.notes as string | undefined,
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string,
      })),
      teamId: row.team_id as string,
      createdBy: row.created_by as string,
      deletedAt: row.deleted_at as string | null,
      deletedBy: row.deleted_by as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
