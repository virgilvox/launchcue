import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'
import { useToast } from 'vue-toastification'
import clientService from '../services/client.service'
import { getClientColor } from '../constants/clientColors'
import type { Client, Contact, Project } from '../types/models'
import type { ClientCreateRequest, ClientUpdateRequest } from '../types/api'

// Response types for store actions
interface ClientStoreResult<T = undefined> {
  success: boolean
  error?: string
  client?: Client
  clients?: Client[]
  contacts?: Contact[]
  projects?: Project[]
  result?: T
}

export const useClientStore = defineStore('client', () => {
  const clients = ref<Client[]>([])
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const authStore = useAuthStore()
  const toast = useToast()

  async function fetchClients(): Promise<Client[] | ClientStoreResult> {
    if (!authStore.currentTeam) return { success: false, error: 'No team selected' }

    loading.value = true
    error.value = null

    try {
      // Get clients from service
      const response: Client[] = await clientService.getClients()

      // Store clients
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
      // Check if we already have the client in state
      const cachedClient = clients.value.find(c => c.id === id)

      if (cachedClient) {
        return { success: true, client: cachedClient }
      }

      // Otherwise fetch from API
      const response: Client = await clientService.getClient(id)
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
      const response: Client = await clientService.createClient({
        ...clientData,
        teamId: authStore.currentTeam.id
      })

      // Add to local state
      clients.value.push(response)

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
      const response: Client = await clientService.updateClient(id, clientData)

      // Update in local state
      const index = clients.value.findIndex(c => c.id === id)

      if (index !== -1) {
        clients.value[index] = response
      }

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
      await clientService.deleteClient(id)

      // Remove from local state
      const index = clients.value.findIndex(c => c.id === id)

      if (index !== -1) {
        clients.value.splice(index, 1)
      }

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
      const response: Contact[] = await clientService.getClientContacts(clientId)
      return { success: true, contacts: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client contacts'
      toast.error('Failed to load client contacts')
      return { success: false, error: message }
    }
  }

  async function getClientProjects(clientId: string): Promise<ClientStoreResult> {
    try {
      const response: Project[] = await clientService.getClientProjects(clientId)
      return { success: true, projects: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch client projects'
      toast.error('Failed to load client projects')
      return { success: false, error: message }
    }
  }

  async function runContactMigration(): Promise<ClientStoreResult<unknown>> {
    try {
      loading.value = true
      error.value = null

      const response: unknown = await clientService.runContactMigration()

      toast.success('Contact migration completed successfully')

      // Reload clients to get updated list
      await fetchClients()

      return { success: true, result: response }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run contact migration'
      error.value = message
      toast.error('Failed to run contact migration')
      return { success: false, error: error.value }
    } finally {
      loading.value = false
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
    runContactMigration,
    getClientColorById
  }
})
