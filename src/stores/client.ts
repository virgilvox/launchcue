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
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const authStore = useAuthStore()
  const toast = useToast()

  function getRepo() {
    return getContainer().resolve<Repository<Client, ClientCreateRequest, Partial<ClientCreateRequest>>>(CLIENT_REPO)
  }

  function getProjectRepo() {
    return getContainer().resolve<Repository<Project>>(PROJECT_REPO)
  }

  async function fetchClients(): Promise<Client[] | ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    loading.value = true
    error.value = null

    try {
      const response = await getRepo().findAll()
      clients.value = response
      loading.value = false
      return response
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch clients'
      error.value = message
      loading.value = false
      toast.error('Failed to fetch clients')
      return { success: false, error: error.value }
    }
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
      toast.error('Failed to load client details')
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
    try {
      const client = await getRepo().findById(clientId)
      return { success: true, contacts: client.contacts || [] }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client contacts'
      toast.error('Failed to load client contacts')
      return { success: false, error: message }
    }
  }

  async function getClientProjects(clientId: string): Promise<ClientStoreResult> {
    try {
      const response = await getProjectRepo().findAll({ clientId })
      return { success: true, projects: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client projects'
      toast.error('Failed to load client projects')
      return { success: false, error: message }
    }
  }

  function getClientColorById(clientId: string): string {
    const client = clients.value.find(c => c.id === clientId)
    return getClientColor(client?.color)
  }

  return {
    clients,
    loading,
    error,
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
