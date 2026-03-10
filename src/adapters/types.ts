import type { User } from '@/types/models'
import type {
  AuthResponse,
  ChangePasswordRequest,
  SearchResult,
} from '@/types/api'

// ─── Repository Interface ───

export interface QueryFilter {
  [key: string]: unknown
}

export interface PaginationOptions {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Repository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  findAll(filter?: QueryFilter): Promise<T[]>
  findById(id: string): Promise<T>
  create(data: CreateDTO): Promise<T>
  update(id: string, data: UpdateDTO): Promise<T>
  delete(id: string): Promise<void>
  /** Optional paginated query — adapters may implement this */
  findPaginated?(filter: QueryFilter, options: PaginationOptions): Promise<PaginatedResult<T>>
}

// ─── Auth Adapter ───

export interface AuthAdapter {
  login(email: string, password: string): Promise<AuthResponse>
  register(data: { name: string; email: string; password: string }): Promise<AuthResponse>
  logout(): Promise<void>
  switchTeam(teamId: string): Promise<AuthResponse>
  changePassword(data: ChangePasswordRequest): Promise<unknown>
  getProfile(): Promise<User>
  updateProfile(data: Partial<User>): Promise<User>
  setToken(token: string | null): void
  getToken(): string | null
  onUnauthorized(callback: () => void): void
}

// ─── Search Adapter ───

export interface SearchAdapter {
  search(query: string, types?: string[]): Promise<SearchResult[]>
}

// ─── AI Adapter ───

export interface AiAdapter {
  process(data: { prompt: string; processingDetails: { type: string; context: string; enriched: boolean }; max_tokens: number }): Promise<unknown>
}

// ─── Comment Repository (non-standard shape) ───

export interface CommentRepository {
  getComments(resourceType: string, resourceId: string): Promise<import('@/types/models').Comment[]>
  createComment(resourceType: string, resourceId: string, data: { content: string }): Promise<import('@/types/models').Comment>
  deleteComment(id: string): Promise<void>
}

// ─── Notification Repository ───

export interface NotificationRepository {
  getAll(): Promise<import('@/types/models').Notification[]>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
  /** Subscribe to real-time notifications. Returns an unsubscribe function. */
  subscribe?(callback: (notification: import('@/types/models').Notification) => void): () => void
}
