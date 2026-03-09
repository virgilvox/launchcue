import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { RESOURCE_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import { useTeamStore } from './team'
import type { Resource } from '../types/models'
import type { ResourceCreateRequest } from '../types/api'

export const useResourceStore = defineStore('resource', () => {
  const resources = ref<Resource[]>([])
  const currentResource = ref<Resource | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const teamStore = useTeamStore()

  function getRepo() {
    return getContainer().resolve<Repository<Resource, ResourceCreateRequest, Partial<ResourceCreateRequest>>>(RESOURCE_REPO)
  }

  async function fetchResources(): Promise<Resource[]> {
    try {
      isLoading.value = true
      error.value = null

      const currentTeam = teamStore.currentTeam
      const teamId = currentTeam?.id

      if (!teamId) {
        error.value = 'No team selected'
        return []
      }

      const data = await getRepo().findAll({ teamId })
      resources.value = data
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load resources'
      error.value = message
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResource(id: string): Promise<Resource | null> {
    try {
      isLoading.value = true
      error.value = null

      const data = await getRepo().findById(id)
      currentResource.value = data
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to load resource ${id}`
      error.value = message
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createResource(resourceData: ResourceCreateRequest & { teamId?: string }): Promise<Resource> {
    try {
      isLoading.value = true
      error.value = null

      const currentTeam = teamStore.currentTeam

      if (!resourceData.teamId && currentTeam) {
        resourceData.teamId = currentTeam.id
      }

      const data = await getRepo().create(resourceData)
      resources.value.push(data)
      getEventBus().emit('resource.created', { resource: data })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create resource'
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateResource(id: string, resourceData: Partial<ResourceCreateRequest>): Promise<Resource> {
    try {
      isLoading.value = true
      error.value = null

      const data = await getRepo().update(id, resourceData)

      const index = resources.value.findIndex(r => r.id === id)
      if (index !== -1) {
        resources.value[index] = data
      }

      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = data
      }

      getEventBus().emit('resource.updated', { resource: data })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to update resource ${id}`
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteResource(id: string): Promise<boolean> {
    try {
      isLoading.value = true
      error.value = null

      await getRepo().delete(id)

      resources.value = resources.value.filter(r => r.id !== id)

      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = null
      }

      getEventBus().emit('resource.deleted', { id })
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `Failed to delete resource ${id}`
      error.value = message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    resources,
    currentResource,
    isLoading,
    error,
    fetchResources,
    fetchResource,
    createResource,
    updateResource,
    deleteResource
  }
})
