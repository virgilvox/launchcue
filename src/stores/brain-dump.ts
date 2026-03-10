import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { BRAIN_DUMP_REPO, AI_ADAPTER } from '@/adapters/repository-keys'
import type { Repository, AiAdapter } from '@/adapters/types'
import type { BrainDump } from '../types/models'
import type { BrainDumpCreateRequest } from '../types/api'
import { useAuthStore } from './auth'

// Extended repository interface for brain-dump-specific operations
interface BrainDumpRepository extends Repository<BrainDump, BrainDumpCreateRequest, Partial<BrainDumpCreateRequest>> {
  getContextData?(params: Record<string, unknown>): Promise<unknown>
  createItems?(payload: Record<string, unknown>): Promise<unknown>
}

export const useBrainDumpStore = defineStore('brainDump', () => {
  const dumps = ref<BrainDump[]>([])
  const isLoading = ref(false)

  function getRepo(): BrainDumpRepository {
    return getContainer().resolve<BrainDumpRepository>(BRAIN_DUMP_REPO)
  }

  function getAi() {
    return getContainer().resolve<AiAdapter>(AI_ADAPTER)
  }

  const fetchDumps = async (): Promise<BrainDump[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll()
      dumps.value = Array.isArray(response) ? response : []
      return dumps.value
    } catch (error) {
      dumps.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createDump = async (data: BrainDumpCreateRequest): Promise<BrainDump> => {
    try {
      const created = await getRepo().create(data)
      if (created && created.id) {
        dumps.value.push(created)
        getEventBus().emit('brain-dump.created', { dump: created })
      }
      return created
    } catch (error) {
      throw error
    }
  }

  const deleteDump = async (id: string): Promise<void> => {
    if (!id) throw new Error('Brain dump ID is required for deletion')
    try {
      await getRepo().delete(id)
      dumps.value = dumps.value.filter(d => d.id !== id)
      getEventBus().emit('brain-dump.deleted', { id })
    } catch (error) {
      throw error
    }
  }

  const processText = async (options: { prompt: string; processingDetails: { type: string; context: string; enriched: boolean }; max_tokens: number }): Promise<unknown> => {
    isLoading.value = true
    try {
      return await getAi().process(options)
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getContextData = async (params: Record<string, unknown>): Promise<unknown> => {
    isLoading.value = true
    try {
      const repo = getRepo()
      if (repo.getContextData) {
        return await repo.getContextData(params)
      }
      throw new Error('getContextData not supported by current adapter')
    } catch (error) {
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createItems = async (payload: Record<string, unknown>): Promise<unknown> => {
    try {
      const repo = getRepo()
      if (repo.createItems) {
        return await repo.createItems(payload)
      }
      throw new Error('createItems not supported by current adapter')
    } catch (error) {
      throw error
    }
  }

  return {
    dumps,
    isLoading,
    fetchDumps,
    createDump,
    deleteDump,
    processText,
    getContextData,
    createItems
  }
})
