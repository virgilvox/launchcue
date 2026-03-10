import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTeamStore } from '@/stores/team'
import { useAuthStore } from '@/stores/auth'
import { TEAM_REPO } from '@/adapters/repository-keys'
import { createMockTeamRepository, makeUser } from '../helpers/mock-factories'
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

describe('useTeamStore', () => {
  let mockRepo: ReturnType<typeof createMockTeamRepository>
  let mockAuth: any

  beforeEach(() => {
    mockRepo = createMockTeamRepository()
    const result = setupStoreTest([{ key: TEAM_REPO, factory: () => mockRepo }])
    mockAuth = result.mockAuth
    seedAuth()
  })

  describe('fetchTeams', () => {
    it('returns error when user not authenticated', async () => {
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('token')
      const authStore = useAuthStore()
      // User is null — fetchTeams should guard
      const store = useTeamStore()
      const result = await store.fetchTeams()
      expect(result.success).toBe(false)
      expect(result.error).toContain('not authenticated')
    })

    it('fetches and stores teams', async () => {
      const teams = [{ id: 't1', name: 'Team 1' }, { id: 't2', name: 'Team 2' }]
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue(teams)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchTeams()

      expect(result.success).toBe(true)
      expect(store.teams).toEqual(teams)
    })

    it('sets error on failure', async () => {
      ;(mockRepo.findAll as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Fetch error'))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchTeams()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Fetch error')
    })
  })

  describe('fetchTeamMembers', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchTeamMembers()
      expect(result.success).toBe(false)
      expect(result.error).toContain('No team selected')
    })

    it('fetches and filters valid members', async () => {
      const members = [
        { userId: 'u1', name: 'User 1', email: 'u1@test.com', role: 'owner' },
        { userId: 'u2', name: 'User 2', email: 'u2@test.com', role: 'member' },
        { userId: null, name: null, email: null }, // invalid
      ]
      ;(mockRepo.getMembers as ReturnType<typeof vi.fn>).mockResolvedValue(members)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchTeamMembers()

      expect(result.success).toBe(true)
      expect(store.teamMembers).toHaveLength(2)
    })
  })

  describe('createTeam', () => {
    it('returns error when user not authenticated', async () => {
      sessionStorage.clear()
      const store = useTeamStore()
      const result = await store.createTeam({ name: 'New Team' })
      expect(result.success).toBe(false)
    })

    it('creates team and adds to list', async () => {
      const created = { id: 'new-t', name: 'New Team' }
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(created)
      // Mock switchTeam in auth adapter
      ;(mockAuth.switchTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: 'new-token',
        user: makeUser(),
        teams: [{ id: 'new-t', name: 'New Team', role: 'owner' }],
      })

      const authStore = useAuthStore()
      await authStore.initAuth()
      // Add team to auth store's userTeams so switchTeam can find it
      authStore.userTeams.push({ id: 'new-t', name: 'New Team', role: 'owner' })

      const store = useTeamStore()
      const result = await store.createTeam({ name: 'New Team' })

      expect(result.success).toBe(true)
      expect(store.teams).toContainEqual(created)
    })

    it('handles create failure', async () => {
      ;(mockRepo.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Create failed'))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.createTeam({ name: 'Fail' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Create failed')
    })
  })

  describe('inviteUser', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.inviteUser('user@test.com')
      expect(result.success).toBe(false)
    })

    it('invites user successfully', async () => {
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.inviteUser('new@test.com')

      expect(result.success).toBe(true)
      expect(mockRepo.inviteUser).toHaveBeenCalledWith('team-1', 'new@test.com')
    })

    it('handles invite failure', async () => {
      ;(mockRepo.inviteUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invite failed'))

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.inviteUser('fail@test.com')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invite failed')
    })
  })

  describe('removeMember', () => {
    it('removes member from array', async () => {
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      store.teamMembers = [
        { userId: 'u1', name: 'A' },
        { userId: 'u2', name: 'B' },
      ] as any[]

      const result = await store.removeMember('u1')

      expect(result.success).toBe(true)
      expect(store.teamMembers).toHaveLength(1)
      expect(store.teamMembers[0].userId).toBe('u2')
    })

    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.removeMember('u1')
      expect(result.success).toBe(false)
    })
  })

  describe('updateMemberRole', () => {
    it('updates member role in array', async () => {
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      store.teamMembers = [
        { userId: 'u1', name: 'A', role: 'member' },
      ] as any[]

      const result = await store.updateMemberRole('u1', 'admin')

      expect(result.success).toBe(true)
      expect(store.teamMembers[0].role).toBe('admin')
      expect(mockRepo.updateMemberRole).toHaveBeenCalledWith('team-1', 'u1', 'admin')
    })

    it('returns error when no team', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.updateMemberRole('u1', 'admin')
      expect(result.success).toBe(false)
    })
  })

  describe('leaveTeam', () => {
    it('removes team from list', async () => {
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      store.teams = [{ id: 't1', name: 'Team 1' }, { id: 't2', name: 'Team 2' }] as any[]

      const result = await store.leaveTeam('t1')

      expect(result.success).toBe(true)
      expect(store.teams).toHaveLength(1)
      expect(store.teams[0].id).toBe('t2')
    })
  })

  describe('getUserInitials', () => {
    it('returns ? for null user', () => {
      const store = useTeamStore()
      expect(store.getUserInitials(null)).toBe('?')
    })

    it('returns ? for undefined user', () => {
      const store = useTeamStore()
      expect(store.getUserInitials(undefined)).toBe('?')
    })

    it('returns two initials from displayName', () => {
      const store = useTeamStore()
      expect(store.getUserInitials({ displayName: 'John Doe' })).toBe('JD')
    })

    it('returns single initial from single name', () => {
      const store = useTeamStore()
      expect(store.getUserInitials({ displayName: 'John' })).toBe('J')
    })

    it('falls back to email initial', () => {
      const store = useTeamStore()
      expect(store.getUserInitials({ email: 'john@test.com' })).toBe('J')
    })

    it('returns ? when no displayName or email', () => {
      const store = useTeamStore()
      expect(store.getUserInitials({})).toBe('?')
    })
  })

  describe('fetchPendingInvites', () => {
    it('returns error when no team selected', async () => {
      sessionStorage.removeItem('currentTeam')
      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchPendingInvites()
      expect(result.success).toBe(false)
    })

    it('fetches invites', async () => {
      const invites = [{ id: 'inv1', email: 'a@test.com' }]
      ;(mockRepo.getPendingInvites as ReturnType<typeof vi.fn>).mockResolvedValue(invites)

      const authStore = useAuthStore()
      await authStore.initAuth()
      const store = useTeamStore()
      const result = await store.fetchPendingInvites()

      expect(result.success).toBe(true)
      expect(store.pendingInvites).toEqual(invites)
    })
  })
})
