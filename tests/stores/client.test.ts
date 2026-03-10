import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useClientStore } from '@/stores/client'
import { CLIENT_REPO, PROJECT_REPO } from '@/adapters/repository-keys'
import { createMockRepository } from '../helpers/mock-factories'
import { setupStoreTest, seedAuth } from '../helpers/store-setup'

vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('@/constants/clientColors', () => ({
  getClientColor: (color: string | undefined) => color || '#000000',
}))

describe('useClientStore', () => {
  let mockClientRepo: ReturnType<typeof createMockRepository>
  let mockProjectRepo: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    mockClientRepo = createMockRepository()
    mockProjectRepo = createMockRepository()
    setupStoreTest([
      { key: CLIENT_REPO, factory: () => mockClientRepo },
      { key: PROJECT_REPO, factory: () => mockProjectRepo },
    ])
    seedAuth()
  })

  describe('fetchClients', () => {
    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useClientStore()
      const result = await store.fetchClients()
      expect((result as any).success).toBe(false)
    })

    it('fetches and stores clients', async () => {
      const clients = [{ id: 'c1', name: 'Client 1' }, { id: 'c2', name: 'Client 2' }]
      ;(mockClientRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(clients)

      const store = useClientStore()
      const result = await store.fetchClients()

      expect(store.clients).toEqual(clients)
    })

    it('handles error', async () => {
      ;(mockClientRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))
      const store = useClientStore()
      const result = await store.fetchClients()
      expect((result as any).success).toBe(false)
    })
  })

  describe('getClient', () => {
    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useClientStore()
      const result = await store.getClient('c1')
      expect(result.success).toBe(false)
    })

    it('returns cached client', async () => {
      const store = useClientStore()
      store.clients = [{ id: 'c1', name: 'Cached' }] as any[]

      const result = await store.getClient('c1')
      expect(result.success).toBe(true)
      expect(result.client?.name).toBe('Cached')
      expect(mockClientRepo.findById).not.toHaveBeenCalled()
    })

    it('fetches from repo when not cached', async () => {
      const client = { id: 'c1', name: 'Fetched' }
      ;(mockClientRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(client)

      const store = useClientStore()
      const result = await store.getClient('c1')

      expect(result.success).toBe(true)
      expect(result.client).toEqual(client)
    })
  })

  describe('createClient', () => {
    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useClientStore()
      const result = await store.createClient({ name: 'Test' } as any)
      expect(result.success).toBe(false)
    })

    it('creates and adds to array', async () => {
      const created = { id: 'c1', name: 'New Client' }
      ;(mockClientRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)

      const store = useClientStore()
      const result = await store.createClient({ name: 'New Client' } as any)

      expect(result.success).toBe(true)
      expect(store.clients).toContainEqual(created)
    })

    it('includes teamId in create payload', async () => {
      ;(mockClientRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1', name: 'Test' })

      const store = useClientStore()
      await store.createClient({ name: 'Test' } as any)

      const call = (mockClientRepo.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(call.teamId).toBe('team-1')
    })
  })

  describe('updateClient', () => {
    it('updates client in array', async () => {
      const updated = { id: 'c1', name: 'Updated' }
      ;(mockClientRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

      const store = useClientStore()
      store.clients = [{ id: 'c1', name: 'Old' }] as any[]

      const result = await store.updateClient('c1', { name: 'Updated' })
      expect(result.success).toBe(true)
      expect(store.clients[0].name).toBe('Updated')
    })
  })

  describe('deleteClient', () => {
    it('removes client from array', async () => {
      ;(mockClientRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const store = useClientStore()
      store.clients = [{ id: 'c1' }, { id: 'c2' }] as any[]

      const result = await store.deleteClient('c1')
      expect(result.success).toBe(true)
      expect(store.clients).toHaveLength(1)
    })
  })

  describe('getClientProjects', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useClientStore()
      const result = await store.getClientProjects('c1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('No team selected')
    })

    it('fetches projects for a client', async () => {
      const projects = [{ id: 'p1', title: 'Project' }]
      ;(mockProjectRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(projects)

      const store = useClientStore()
      const result = await store.getClientProjects('c1')

      expect(result.success).toBe(true)
      expect(result.projects).toEqual(projects)
    })
  })

  describe('getClientColorById', () => {
    it('returns color from client', () => {
      const store = useClientStore()
      store.clients = [{ id: 'c1', color: '#ff0000' }] as any[]
      expect(store.getClientColorById('c1')).toBe('#ff0000')
    })

    it('returns default for unknown client', () => {
      const store = useClientStore()
      expect(store.getClientColorById('unknown')).toBe('#000000')
    })
  })

  describe('getClientContacts', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const store = useClientStore()
      const result = await store.getClientContacts('c1')
      expect(result.success).toBe(false)
      expect(result.error).toBe('No team selected')
    })

    it('returns contacts from client', async () => {
      const client = { id: 'c1', contacts: [{ name: 'Contact 1' }] }
      ;(mockClientRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(client)

      const store = useClientStore()
      const result = await store.getClientContacts('c1')

      expect(result.success).toBe(true)
      expect(result.contacts).toHaveLength(1)
    })
  })
})
