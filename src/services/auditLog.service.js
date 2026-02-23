import apiService from './api.service'

const AUDIT_LOG_ENDPOINT = '/.netlify/functions/audit-logs'

export default {
  getAuditLogs(params = {}) {
    return apiService.get(AUDIT_LOG_ENDPOINT, params)
  },
}
