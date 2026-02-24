import { defineStore } from 'pinia'
import { ref } from 'vue'
import resourceService from '@/services/resource.service'
import { useTeamStore } from './team'
import type { Resource } from '../types/models'
import type { ResourceCreateRequest } from '../types/api'

export const useResourceStore = defineStore('resource', () => {
  const resources = ref<Resource[]>([])
  const currentResource = ref<Resource | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const teamStore = useTeamStore()

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

      const data: Resource[] = await resourceService.getResources(teamId)
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

      const data: Resource = await resourceService.getResource(id)
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

      // Add team ID if not provided
      if (!resourceData.teamId && currentTeam) {
        resourceData.teamId = currentTeam.id
      }

      const data: Resource = await resourceService.createResource(resourceData)
      resources.value.push(data)
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

      const data: Resource = await resourceService.updateResource(id, resourceData)

      // Update in the resources array
      const index = resources.value.findIndex(r => r.id === id)
      if (index !== -1) {
        resources.value[index] = data
      }

      // Update current resource if it's the one being edited
      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = data
      }

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

      await resourceService.deleteResource(id)

      // Remove from the resources array
      resources.value = resources.value.filter(r => r.id !== id)

      // Clear current resource if it's the one being deleted
      if (currentResource.value && currentResource.value.id === id) {
        currentResource.value = null
      }

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
