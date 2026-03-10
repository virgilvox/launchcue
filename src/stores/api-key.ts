import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { API_KEY_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import type { ApiKey } from '../types/models'
import type { ApiKeyCreateRequest, ApiKeyCreateResponse } from '../types/api'
import { useAuthStore } from './auth'

export const useApiKeyStore = defineStore('apiKey', () => {
  const apiKeys = ref<ApiKey[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<Repository<ApiKey, ApiKeyCreateRequest, never>>(API_KEY_REPO)
  }

  const fetchApiKeys = async (): Promise<ApiKey[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().findAll()
      apiKeys.value = Array.isArray(response) ? response : []
      return apiKeys.value
    } catch (error) {
      apiKeys.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const generateKey = async (data: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const created = await getRepo().create(data)
      // The create response includes the full key (only shown once)
      apiKeys.value.push(created as unknown as ApiKey)
      getEventBus().emit('api-key.created', { apiKey: created })
      return created as unknown as ApiKeyCreateResponse
    } catch (error) {
      throw error
    }
  }

  const deleteKey = async (prefix: string): Promise<void> => {
    if (!prefix) throw new Error('API key prefix is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      await getRepo().delete(prefix)
      apiKeys.value = apiKeys.value.filter(k => k.prefix !== prefix)
      getEventBus().emit('api-key.deleted', { prefix })
    } catch (error) {
      throw error
    }
  }

  return {
    apiKeys,
    isLoading,
    fetchApiKeys,
    generateKey,
    deleteKey
  }
})
