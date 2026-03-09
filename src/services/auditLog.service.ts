import apiService from './api.service'
import type { AuditLog } from '@/types/models'

const AUDIT_LOG_ENDPOINT = '/.netlify/functions/audit-logs'

export default {
  getAuditLogs(params: Record<string, unknown> = {}): Promise<AuditLog[]> {
    return apiService.get<AuditLog[]>(AUDIT_LOG_ENDPOINT, params)
  },
}
