import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { initContainer } from '@/core/service-container'
import { AUTH_ADAPTER } from '@/adapters/repository-keys'
import { TEAM_REPO } from '@/adapters/repository-keys'
import type { AuthAdapter } from '@/adapters/types'

// Mock the router to avoid actual navigation
vi.mock('@/router', () => ({
  default: { push: vi.fn() },
}))

function createMockAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
  return {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    switchTeam: vi.fn(),
    changePassword: vi.fn(),
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getTeams: vi.fn().mockResolvedValue([]),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    setToken: vi.fn(),
    getToken: vi.fn().mockReturnValue(null),
    onUnauthorized: vi.fn(),
    ...overrides,
  }
}

/** Create a valid JWT token with given expiry (seconds since epoch) */
function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp, sub: 'user-1' }))
  return `${header}.${payload}.fake-signature`
}

describe('useAuthStore', () => {
  let mockAuth: AuthAdapter

  beforeEach(() => {
    // Clear sessionStorage
    sessionStorage.clear()

    // Set up Pinia
    setActivePinia(createPinia())

    // Set up service container with mock auth adapter
    mockAuth = createMockAuthAdapter()
    const container = initContainer()
    container.register(AUTH_ADAPTER, () => mockAuth)
  })

  describe('initAuth', () => {
    it('returns true with valid token in sessionStorage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const token = makeJwt(futureExp)
      const user = { id: '1', name: 'Test', email: 'test@example.com' }

      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))

      const store = useAuthStore()
      const result = store.initAuth()

      expect(result).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.email).toBe('test@example.com')
      expect(mockAuth.setToken).toHaveBeenCalledWith(token)
    })

    it('returns false and clears state with expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const token = makeJwt(pastExp)
      const user = { id: '1', name: 'Test', email: 'test@example.com' }

      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify(user))

      const store = useAuthStore()
      const result = store.initAuth()

      expect(result).toBe(false)
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(sessionStorage.getItem('token')).toBeNull()
      expect(sessionStorage.getItem('user')).toBeNull()
      expect(mockAuth.setToken).toHaveBeenCalledWith(null)
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
      // Set up authenticated state
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))

      const store = useAuthStore()
      store.initAuth()
      expect(store.isAuthenticated).toBe(true)

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(sessionStorage.getItem('token')).toBeNull()
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
      const token = makeJwt(futureExp)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))
      sessionStorage.setItem('teams', JSON.stringify([
        { id: 'team-1', name: 'Team One', role: 'owner' },
        { id: 'team-2', name: 'Team Two', role: 'member' },
      ]))

      const newToken = makeJwt(futureExp)
      ;(mockAuth.switchTeam as ReturnType<typeof vi.fn>).mockResolvedValue({
        token: newToken,
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'member' },
        teams: [{ id: 'team-2', name: 'Team Two', role: 'member' }],
      })

      const store = useAuthStore()
      store.initAuth()
      const result = await store.switchTeam('team-2')

      expect(result.id).toBe('team-2')
      expect(store.currentTeam?.id).toBe('team-2')
      expect(store.token).toBe(newToken)
    })

    it('rolls back on switch failure', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      const token = makeJwt(futureExp)
      sessionStorage.setItem('token', token)
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))
      sessionStorage.setItem('teams', JSON.stringify([
        { id: 'team-1', name: 'Team One', role: 'owner' },
        { id: 'team-2', name: 'Team Two', role: 'member' },
      ]))
      sessionStorage.setItem('currentTeam', JSON.stringify({ id: 'team-1', name: 'Team One', role: 'owner' }))

      ;(mockAuth.switchTeam as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Switch failed'))

      const store = useAuthStore()
      store.initAuth()

      await expect(store.switchTeam('team-2')).rejects.toThrowError(/Switch failed/)
      expect(store.currentTeam?.id).toBe('team-1')
      expect(store.token).toBe(token)
    })
  })

  describe('loadUserTeams', () => {
    it('loads teams and sets current team', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))

      ;(mockAuth.getTeams as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'team-1', name: 'Team One', role: 'owner' },
        { id: 'team-2', name: 'Team Two', role: 'member' },
      ])

      const store = useAuthStore()
      store.initAuth()
      await store.loadUserTeams()

      expect(store.userTeams).toHaveLength(2)
      expect(store.currentTeam?.id).toBe('team-1')
    })
  })

  describe('createTeam', () => {
    it('creates team via TEAM_REPO and adds to userTeams', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))

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
      store.initAuth()
      const result = await store.createTeam('New Team')

      expect(mockTeamRepo.create).toHaveBeenCalledWith({ name: 'New Team' })
      expect(result.id).toBe('new-team')
      expect(result.role).toBe('owner')
      expect(store.userTeams).toContainEqual(expect.objectContaining({ id: 'new-team' }))
    })
  })

  describe('role-based computed properties', () => {
    it('computes role correctly from user data', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({
        id: '1', name: 'Test', email: 'test@example.com', role: 'admin'
      }))

      const store = useAuthStore()
      store.initAuth()

      expect(store.userRole).toBe('admin')
      expect(store.isOwner).toBe(false)
      expect(store.isAdmin).toBe(true)
      expect(store.canManageTeam).toBe(true)
      expect(store.canEdit).toBe(true)
      expect(store.isViewer).toBe(false)
    })

    it('owner has all permissions', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({
        id: '1', name: 'Test', email: 'test@example.com', role: 'owner'
      }))

      const store = useAuthStore()
      store.initAuth()

      expect(store.isOwner).toBe(true)
      expect(store.canManageTeam).toBe(true)
      expect(store.canEdit).toBe(true)
    })

    it('viewer cannot edit or manage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({
        id: '1', name: 'Test', email: 'test@example.com', role: 'viewer'
      }))

      const store = useAuthStore()
      store.initAuth()

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

    it('is true when both user and token are set', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test', email: 'test@example.com' }))

      const store = useAuthStore()
      store.initAuth()
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('updateUserState', () => {
    it('merges partial user data without overwriting id/email', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      sessionStorage.setItem('token', makeJwt(futureExp))
      sessionStorage.setItem('user', JSON.stringify({
        id: '1', name: 'Test', email: 'test@example.com'
      }))

      const store = useAuthStore()
      store.initAuth()
      store.updateUserState({ name: 'Updated Name' })

      expect(store.user?.name).toBe('Updated Name')
      expect(store.user?.id).toBe('1')
      expect(store.user?.email).toBe('test@example.com')
    })
  })
})
