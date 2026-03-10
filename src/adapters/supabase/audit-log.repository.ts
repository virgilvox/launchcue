import type { AuditLog } from '@/types/models'
import { SupabaseBaseRepository } from './base.repository'

export class SupabaseAuditLogRepository extends SupabaseBaseRepository<AuditLog, never, never> {
  constructor() {
    super('audit_logs', 'audit_logs', {
      userId: 'user_id',
      teamId: 'team_id',
      resourceType: 'resource_type',
      resourceId: 'resource_id',
    })
  }

  protected mapFromDb(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      teamId: row.team_id as string,
      action: row.action as string,
      resourceType: row.resource_type as string,
      resourceId: row.resource_id as string,
      changes: row.changes as Record<string, { from: unknown; to: unknown }> | undefined,
      timestamp: row.timestamp as string,
    }
  }

  async create(_data: never): Promise<AuditLog> {
    throw new Error('Audit logs are system-generated and cannot be created manually')
  }

  async update(_id: string, _data: never): Promise<AuditLog> {
    throw new Error('Audit logs are immutable')
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Audit logs cannot be deleted')
  }
}
