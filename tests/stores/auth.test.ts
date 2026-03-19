import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { initContainer } from '@/core/service-container'
import { AUTH_ADAPTER, TEAM_REPO } from '@/adapters/repository-keys'
import type { AuthAdapter } from '@/adapters/types'
import { createMockAuthAdapter, makeJwt, makeUser, makeTeamSummary } from '../helpers/mock-factories'
import { seedAuth } from '../helpers/store-setup'

// Mock the router to avoid actual navigation
vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

describe('useAuthStore', () => {
  let mockAuth: AuthAdapter

  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    mockAuth = createMockAuthAdapter()
    const container = initContainer()
    container.register(AUTH_ADAPTER, () => mockAuth)
  })

  describe('initAuth', () => {
    it('returns true with valid session from SDK', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = makeJwt(futureExp)
      const user = makeUser()

      // Simulate SDK session available
      ;(mockAuth as any).getSession = vi.fn().mockResolvedValue({ access_token: token })
      sessionStorage.setItem('user', JSON.stringify(user))

      const store = useAuthStore()
      const result = await store.initAuth()

      expect(result).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.email).toBe('test@example.com')
      expect(store.token).toBe(token)
    })

    it('returns false when no SDK session exists', async () => {
      ;(mockAuth as any).getSession = vi.fn().mockResolvedValue(null)

      const store = useAuthStore()
      const result = await store.initAuth()

      expect(result).toBe(false)
      expect(store.isAuthenticated).toBe(false)
    })

    it('rebuilds user data from API when sessionStorage is empty (new tab)', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = makeJwt(futureExp)
      const profile = makeUser({ name: 'Rebuilt User' })
      const teams = [makeTeamSummary()]

      ;(mockAuth as any).getSession = vi.fn().mockResolvedValue({ access_token: token })
      ;(mockAuth.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue(profile)
      ;(mockAuth.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue(teams)

      const store = useAuthStore()
      const result = await store.initAuth()

      expect(result).toBe(true)
      expect(store.user?.name).toBe('Rebuilt User')
      expect(store.userTeams).toHaveLength(1)
      expect(store.currentTeam?.id).toBe('team-1')
    })

    it('returns false when getSession is not available and no SDK session', async () => {
      // No getSession, no SDK session — should not authenticate
      sessionStorage.setItem('user', JSON.stringify(makeUser()))

      const store = useAuthStore()
      const result = await store.initAuth()

      expect(result).toBe(false)
      expect(store.isAuthenticated).toBe(false)
    })

    it('returns false when no session exists at all', async () => {
      const store = useAuthStore()
      const result = await store.initAuth()

      expect(result).toBe(false)
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('calls adapter.login and sets state on success', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const loginResponse = {
        token: makeJwt(futureExp),
        user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'owner' },
        currentTeamId: 'team-1',
        teams: [{ id: 'team-1', name: 'Team One', role: 'owner' }],
      }
      ;(mockAuth.login as ReturnType<typeof vi.fn>).mockResolvedValue(loginResponse)
      ;(mockAuth.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'team-1', name: 'Team One', role: 'owner' },
      ])

      const store = useAuthStore()
      const result = await store.login('test@example.com', 'password123')

      expect(mockAuth.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(result.email).toBe('test@example.com')
      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.name).toBe('Test User')
      expect(store.token).toBe(loginResponse.token)
    })

    it('throws on failed login', async () => {
      ;(mockAuth.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        message: 'Invalid credentials',
      })

      const store = useAuthStore()
      await expect(store.login('bad@example.com', 'wrong')).rejects.toThrowError(/Invalid credentials/)
    })
  })

  describe('logout', () => {
    it('clears state and sessionStorage', async () => {
      seedAuth({ mockAuth: mockAuth })
      const store = useAuthStore()
      await store.initAuth()
      expect(store.isAuthenticated).toBe(true)

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem('user')).toBeNull()
      expect(mockAuth.logout).toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('calls adapter.register and sets state on success', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const registerResponse = {
        token: makeJwt(futureExp),
        user: { id: '2', name: 'New User', email: 'new@example.com' },
        currentTeamId: 'team-1',
      }
      ;(mockAuth.register as ReturnType<typeof vi.fn>).mockResolvedValue(registerResponse)
      ;(mockAuth.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'team-1', name: 'My Team', role: 'owner' },
      ])

      const store = useAuthStore()
      const result = await store.register('new@example.com', 'password123', 'New User')

      expect(mockAuth.register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })
      expect(result.email).toBe('new@example.com')
      expect(store.isAuthenticated).toBe(true)
      expect(store.currentTeam?.id).toBe('team-1')
    })

    it('throws on failed registration', async () => {
      ;(mockAuth.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        message: 'Email already exists',
      })

      const store = useAuthStore()
      await expect(store.register('dup@example.com', 'pass', 'Dup')).rejects.toThrowError(/Email already exists/)
    })
  })

  describe('switchTeam', () => {
    it('switches team and updates token', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      seedAuth({
        mockAuth: mockAuth,
        teams: [
          { id: 'team-1', name: 'Team One', role: 'owner' },
          { id: 'team-2', name: 'Team Two', role: 'member' },
        ],
      })

      const newToken = makeJwt(futureExp)
      ;(mockAuth.switchTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: newToken,
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'member' },
        teams: [{ id: 'team-2', name: 'Team Two', role: 'member' }],
      })

      const store = useAuthStore()
      await store.initAuth()
      const result = await store.switchTeam('team-2')

      expect(result.id).toBe('team-2')
      expect(store.currentTeam?.id).toBe('team-2')
      expect(store.token).toBe(newToken)
    })

    it('rolls back on switch failure', async () => {
      const { token } = seedAuth({
        mockAuth: mockAuth,
        teams: [
          { id: 'team-1', name: 'Team One', role: 'owner' },
          { id: 'team-2', name: 'Team Two', role: 'member' },
        ],
        currentTeam: { id: 'team-1', name: 'Team One', role: 'owner' },
      })

      ;(mockAuth.switchTeam as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Switch failed'))

      const store = useAuthStore()
      await store.initAuth()

      await expect(store.switchTeam('team-2')).rejects.toThrowError(/Switch failed/)
      expect(store.currentTeam?.id).toBe('team-1')
      expect(store.token).toBe(token)
    })
  })

  describe('loadUserTeams', () => {
    it('loads teams and sets current team', async () => {
      seedAuth({ mockAuth: mockAuth })

      ;(mockAuth.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'team-1', name: 'Team One', role: 'owner' },
        { id: 'team-2', name: 'Team Two', role: 'member' },
      ])

      const store = useAuthStore()
      await store.initAuth()
      await store.loadUserTeams()

      expect(store.userTeams).toHaveLength(2)
      expect(store.currentTeam?.id).toBe('team-1')
    })
  })

  describe('createTeam', () => {
    it('creates team via TEAM_REPO and adds to userTeams', async () => {
      seedAuth({ mockAuth: mockAuth })

      const mockTeamRepo = {
        create: vi.fn().mockResolvedValue({ id: 'new-team', name: 'New Team' }),
        findAll: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      const container = initContainer()
      container.register(AUTH_ADAPTER, () => mockAuth)
      container.register(TEAM_REPO, () => mockTeamRepo)

      const store = useAuthStore()
      await store.initAuth()
      const result = await store.createTeam('New Team')

      expect(mockTeamRepo.create).toHaveBeenCalledWith({ name: 'New Team' })
      expect(result.id).toBe('new-team')
      expect(result.role).toBe('owner')
      expect(store.userTeams).toContainEqual(expect.objectContaining({ id: 'new-team' }))
    })
  })

  describe('role-based computed properties', () => {
    it('computes role correctly from user data', async () => {
      seedAuth({ mockAuth: mockAuth, user: makeUser({ role: 'admin' }) })

      const store = useAuthStore()
      await store.initAuth()

      expect(store.userRole).toBe('admin')
      expect(store.isOwner).toBe(false)
      expect(store.isAdmin).toBe(true)
      expect(store.canManageTeam).toBe(true)
      expect(store.canEdit).toBe(true)
      expect(store.isViewer).toBe(false)
    })

    it('owner has all permissions', async () => {
      seedAuth({ mockAuth: mockAuth, user: makeUser({ role: 'owner' }) })

      const store = useAuthStore()
      await store.initAuth()

      expect(store.isOwner).toBe(true)
      expect(store.canManageTeam).toBe(true)
      expect(store.canEdit).toBe(true)
    })

    it('viewer cannot edit or manage', async () => {
      seedAuth({ mockAuth: mockAuth, user: makeUser({ role: 'viewer' }) })

      const store = useAuthStore()
      await store.initAuth()

      expect(store.isViewer).toBe(true)
      expect(store.canEdit).toBe(false)
      expect(store.canManageTeam).toBe(false)
    })
  })

  describe('isAuthenticated', () => {
    it('is false when no user or token', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('is true when both user and token are set', async () => {
      seedAuth({ mockAuth: mockAuth })

      const store = useAuthStore()
      await store.initAuth()
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('updateUserState', () => {
    it('merges partial user data without overwriting id/email', async () => {
      seedAuth({ mockAuth: mockAuth })

      const store = useAuthStore()
      await store.initAuth()
      store.updateUserState({ name: 'Updated Name' })

      expect(store.user?.name).toBe('Updated Name')
      expect(store.user?.id).toBe('user-1')
      expect(store.user?.email).toBe('test@example.com')
    })
  })
})
