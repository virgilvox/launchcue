import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { AUDIT_LOG_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { AuditLog } from '../types/models'

export const useAuditLogStore = defineStore('auditLog', () => {
  const logs = ref<AuditLog[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<Repository<AuditLog, never, never>>(AUDIT_LOG_REPO)
  }

  const fetchLogs = async (params?: Record<string, unknown>): Promise<AuditLog[]> => {
    isLoading.value = true
    try {
      const response = await getRepo().findAll(params)
      logs.value = Array.isArray(response) ? response : []
      return logs.value
    } catch (error) {
      logs.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    logs,
    isLoading,
    fetchLogs
  }
})
