import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { AUDIT_LOG_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { AuditLog } from '../types/models'
import { useAuthStore } from './auth'

export const useAuditLogStore = defineStore('auditLog', () => {
  const logs = ref<AuditLog[]>([])
  const isLoading = ref(false)

  // Pagination state
  const currentPage = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(25)

  function getRepo() {
    return getContainer().resolve<Repository<AuditLog, never, never>>(AUDIT_LOG_REPO)
  }

  const fetchLogs = async (
    params?: Record<string, unknown>,
    pagination?: { page?: number; limit?: number }
  ): Promise<AuditLog[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const repo = getRepo()
      // Extract pagination from params for backward compat, or use explicit pagination arg
      const page = pagination?.page ?? (params?.page as number | undefined) ?? 1
      const limit = pagination?.limit ?? (params?.limit as number | undefined) ?? 25

      // Build filter without pagination keys
      const filter: Record<string, unknown> = {}
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (key !== 'page' && key !== 'limit') {
            filter[key] = value
          }
        }
      }

      if (repo.findPaginated) {
        const result = await repo.findPaginated(filter, { page, limit })
        logs.value = result.data || []
        currentPage.value = result.page
        totalItems.value = result.total
        totalPages.value = result.totalPages
        pageSize.value = result.limit
      } else {
        const response = await repo.findAll(filter)
        logs.value = Array.isArray(response) ? response : []
        totalItems.value = logs.value.length
        totalPages.value = 1
        currentPage.value = 1
      }
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
    currentPage,
    totalItems,
    totalPages,
    pageSize,
    fetchLogs
  }
})
