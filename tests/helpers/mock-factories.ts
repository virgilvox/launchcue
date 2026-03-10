import { vi } from 'vitest'
import type { AuthAdapter, Repository, CommentRepository, NotificationRepository } from '@/adapters/types'

/** Create a valid JWT token with given expiry (seconds since epoch) */
export function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp, sub: 'user-1' }))
  return `${header}.${payload}.fake-signature`
}

/** Create a mock user object */
export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock team summary */
export function makeTeamSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-1',
    name: 'Test Team',
    role: 'owner',
    ...overrides,
  }
}

/** Create a mock Repository<T> with all methods as vi.fn() */
export function createMockRepository<T = unknown>(overrides: Partial<Repository<T>> = {}): Repository<T> {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/** Create a mock AuthAdapter */
export function createMockAuthAdapter(overrides: Partial<AuthAdapter> = {}): AuthAdapter {
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

/** Create a mock NotificationRepository */
export function createMockNotificationRepository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    markRead: vi.fn().mockResolvedValue(undefined),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/** Create a mock CommentRepository */
export function createMockCommentRepository(overrides: Partial<CommentRepository> = {}): CommentRepository {
  return {
    getComments: vi.fn().mockResolvedValue([]),
    createComment: vi.fn().mockResolvedValue(null),
    updateComment: vi.fn().mockResolvedValue(null),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

/** Create a mock TeamRepository (extends Repository with team-specific methods) */
export function createMockTeamRepository(overrides: Record<string, unknown> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    getMembers: vi.fn().mockResolvedValue([]),
    inviteUser: vi.fn().mockResolvedValue(undefined),
    getPendingInvites: vi.fn().mockResolvedValue([]),
    removeMember: vi.fn().mockResolvedValue(undefined),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    leaveTeam: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}
