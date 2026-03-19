import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { CLIENT_REPO, PROJECT_REPO } from '@/adapters/repository-keys'
import type { Repository } from '@/adapters/types'
import { getClientColor } from '../constants/clientColors'
import type { Client, Project } from '../types/models'
import type { ClientCreateRequest } from '../types/api'
import { useLoadingCounter } from '@/composables/useLoadingCounter'

interface ClientStoreResult<T = undefined> {
  success: boolean
  error?: string
  client?: Client
  clients?: Client[]
  contacts?: import('../types/models').Contact[]
  projects?: Project[]
  result?: T
}

export const useClientStore = defineStore('client', () => {
  const clients = ref<Client[]>([])
  const error = ref<string | null>(null)
  const authStore = useAuthStore()
  const toast = useToast()
  const { isLoading, wrap } = useLoadingCounter()

  // Pagination state
  const currentPage = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(0)
  const pageSize = ref(50)

  function getRepo() {
    return getContainer().resolve<Repository<Client, ClientCreateRequest, Partial<ClientCreateRequest>>>(CLIENT_REPO)
  }

  function getProjectRepo() {
    return getContainer().resolve<Repository<Project>>(PROJECT_REPO)
  }

  async function fetchClients(pagination?: { page?: number; limit?: number }): Promise<Client[] | ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    return wrap(async () => {
      error.value = null
      try {
        const repo = getRepo()
        const page = pagination?.page ?? 1
        const limit = pagination?.limit ?? 50

        if (repo.findPaginated) {
          const result = await repo.findPaginated({}, { page, limit })
          clients.value = result.data || []
          currentPage.value = result.page
          totalItems.value = result.total
          totalPages.value = result.totalPages
          pageSize.value = result.limit
        } else {
          const response = await repo.findAll()
          clients.value = response
          totalItems.value = response.length
          totalPages.value = 1
          currentPage.value = 1
        }
        return clients.value
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch clients'
        error.value = message
        return { success: false, error: error.value }
      }
    })
  }

  async function getClient(id: string): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    try {
      const cachedClient = clients.value.find(c => c.id === id)
      if (cachedClient) {
        return { success: true, client: cachedClient }
      }

      const response = await getRepo().findById(id)
      return { success: true, client: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get client'
      return { success: false, error: message }
    }
  }

  async function createClient(clientData: ClientCreateRequest): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    try {
      const response = await getRepo().create({
        ...clientData,
        teamId: authStore.currentTeam.id
      } as ClientCreateRequest)

      clients.value.push(response)
      getEventBus().emit('client.created', { client: response })

      toast.success('Client created successfully')
      return { success: true, client: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create client'
      toast.error('Failed to create client')
      return { success: false, error: message }
    }
  }

  async function updateClient(id: string, clientData: Partial<ClientCreateRequest>): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    try {
      const response = await getRepo().update(id, clientData)

      const index = clients.value.findIndex(c => c.id === id)
      if (index !== -1) {
        clients.value[index] = response
      }

      getEventBus().emit('client.updated', { client: response })
      toast.success('Client updated successfully')
      return { success: true, client: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update client'
      toast.error('Failed to update client')
      return { success: false, error: message }
    }
  }

  async function deleteClient(id: string): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    try {
      await getRepo().delete(id)

      const index = clients.value.findIndex(c => c.id === id)
      if (index !== -1) {
        clients.value.splice(index, 1)
      }
      totalItems.value = Math.max(0, totalItems.value - 1)
      totalPages.value = Math.max(1, Math.ceil(totalItems.value / pageSize.value))
      if (currentPage.value > totalPages.value) currentPage.value = totalPages.value

      getEventBus().emit('client.deleted', { id })
      toast.success('Client deleted successfully')
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete client'
      toast.error('Failed to delete client')
      return { success: false, error: message }
    }
  }

  async function getClientContacts(clientId: string): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }
    try {
      const client = await getRepo().findById(clientId)
      return { success: true, contacts: client.contacts || [] }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client contacts'
      return { success: false, error: message }
    }
  }

  async function getClientProjects(clientId: string): Promise<ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }
    try {
      const response = await getProjectRepo().findAll({ clientId })
      return { success: true, projects: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client projects'
      return { success: false, error: message }
    }
  }

  function getClientColorById(clientId: string): string {
    const client = clients.value.find(c => c.id === clientId)
    return getClientColor(client?.color)
  }

  return {
    clients,
    isLoading,
    error,
    currentPage,
    totalItems,
    totalPages,
    pageSize,
    fetchClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getClientContacts,
    getClientProjects,
    getClientColorById
  }
})
