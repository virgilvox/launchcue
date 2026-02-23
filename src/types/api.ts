// ─── API Response Shapes ───

export interface ApiError {
  statusCode: number
  message: string
  errorType?: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Auth ───
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
  }
  teams: Array<{
    id: string
    name: string
    role: string
  }>
}

export interface SwitchTeamRequest {
  teamId: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// ─── Task ───
export interface TaskCreateRequest {
  title: string
  description?: string
  status?: string
  type?: string
  priority?: string
  projectId?: string | null
  assigneeId?: string | null
  parentTaskId?: string | null
  dueDate?: string | null
  checklist?: Array<{ id?: string; title: string; completed?: boolean }>
  tags?: string[]
  timeEstimate?: number
}

export interface TaskUpdateRequest extends Partial<TaskCreateRequest> {
  id: string
  timeSpent?: number
}

export interface TaskFilter {
  projectId?: string
  status?: string
  priority?: string
  assigneeId?: string
  search?: string
}

// ─── Project ───
export interface ProjectCreateRequest {
  title: string
  description?: string
  status?: string
  clientId: string
  startDate?: string | null
  dueDate?: string | null
  tags?: string[]
  budget?: number | null
  goals?: string[]
}

export interface ProjectUpdateRequest extends Partial<ProjectCreateRequest> {
  id: string
}

// ─── Client ───
export interface ClientCreateRequest {
  name: string
  industry?: string
  website?: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  notes?: string
}

export interface ClientUpdateRequest extends Partial<ClientCreateRequest> {
  id: string
}

// ─── Campaign ───
export interface CampaignCreateRequest {
  title: string
  description?: string
  status?: string
  types?: string[]
  clientId?: string | null
  projectId?: string | null
  startDate?: string | null
  endDate?: string | null
  steps?: Array<{
    title: string
    description?: string
    date: string
    assigneeId?: string | null
  }>
  budget?: number
}

// ─── Note ───
export interface NoteCreateRequest {
  title: string
  content: string
  tags?: string[]
  clientId?: string | null
  projectId?: string | null
}

// ─── Calendar Event ───
export interface CalendarEventCreateRequest {
  title: string
  start: string
  end?: string | null
  allDay?: boolean
  description?: string
  color?: string
  clientId?: string | null
  projectId?: string | null
}

// ─── Resource ───
export interface ResourceCreateRequest {
  name: string
  type: string
  url: string
  description?: string
  tags?: string[]
}

// ─── Brain Dump ───
export interface BrainDumpCreateRequest {
  title: string
  content?: string
  tags?: string[]
  clientId?: string | null
  projectId?: string | null
}

// ─── Search ───
export interface SearchRequest {
  query: string
  types?: string[]
  limit?: number
}

export interface SearchResult {
  type: 'client' | 'project' | 'task' | 'note' | 'campaign'
  id: string
  title: string
  description?: string
  matchField: string
}

// ─── API Key ───
export interface ApiKeyCreateRequest {
  name: string
  scopes?: string[]
}

export interface ApiKeyCreateResponse {
  key: string
  id: string
  name: string
  prefix: string
  scopes: string[]
}

// ─── Team ───
export interface TeamCreateRequest {
  name: string
}

export interface TeamInviteRequest {
  email: string
  role?: string
}

// ─── Profile ───
export interface ProfileUpdateRequest {
  name?: string
  jobTitle?: string
  bio?: string
  avatarUrl?: string
}
