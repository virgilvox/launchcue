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

/** Create a mock scope object */
export function makeScope(overrides: Record<string, unknown> = {}) {
  return {
    id: 'scope-1',
    title: 'Test Scope',
    description: 'Test scope description',
    projectId: 'project-1',
    clientId: 'client-1',
    status: 'draft',
    deliverables: [],
    terms: '',
    totalAmount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock scope template object */
export function makeScopeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'template-1',
    title: 'Test Template',
    description: 'Test template description',
    deliverables: [
      { title: 'Deliverable 1', description: 'Desc', quantity: 1, unit: 'ea', rate: 100, estimatedHours: 5 },
    ],
    terms: 'Net 30',
    tags: [],
    teamId: 'team-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock note object */
export function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-1',
    title: 'Test Note',
    content: 'Test note content',
    tags: [],
    clientId: null,
    projectId: null,
    teamId: 'team-1',
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock resource object */
export function makeResource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resource-1',
    name: 'Test Resource',
    type: 'document',
    url: 'https://example.com/doc',
    description: 'Test resource description',
    tags: [],
    teamId: 'team-1',
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock webhook object */
export function makeWebhook(overrides: Record<string, unknown> = {}) {
  return {
    id: 'webhook-1',
    url: 'https://example.com/webhook',
    events: ['task.created'],
    active: true,
    teamId: 'team-1',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

/** Create a mock API key object */
export function makeApiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 'api-key-1',
    prefix: 'lc_test',
    name: 'Test API Key',
    teamId: 'team-1',
    createdAt: '2024-01-01T00:00:00Z',
    lastUsedAt: null,
    ...overrides,
  }
}

/** Create a mock audit log object */
export function makeAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'log-1',
    action: 'task.created',
    userId: 'user-1',
    teamId: 'team-1',
    resourceType: 'task',
    resourceId: 'task-1',
    metadata: {},
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}
