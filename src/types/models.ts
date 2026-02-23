import type {
  TaskStatus,
  TaskPriority,
  ProjectStatus,
  CampaignStatus,
  TeamRole,
  EventColor,
  NotificationType,
  ApiScope,
  InviteStatus,
} from './enums'

// ─── Common ───
export interface SoftDeletable {
  deletedAt: string | null
  deletedBy: string | null
}

export interface Timestamped {
  createdAt: string
  updatedAt: string
}

// ─── User ───
export interface User extends Timestamped {
  id: string
  name: string
  email: string
  jobTitle?: string
  bio?: string
  avatarUrl?: string
  emailVerified?: boolean
  timezone?: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  notifications?: {
    email: boolean
    inApp: boolean
  }
}

// ─── Team ───
export interface Team extends Timestamped {
  id: string
  name: string
  owner: string
  members: TeamMember[]
}

export interface TeamMember {
  userId: string
  email: string
  name: string
  role: TeamRole
  joinedAt: string
}

export interface TeamInvite extends Timestamped {
  id: string
  email: string
  teamId: string
  invitedBy: string
  status: InviteStatus
  role: TeamRole
  expiresAt: string
}

// ─── Client ───
export interface Client extends Timestamped, SoftDeletable {
  id: string
  name: string
  industry?: string
  website?: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  notes?: string
  contacts: Contact[]
  teamId: string
  createdBy: string
}

export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  isPrimary: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Project ───
export interface Project extends Timestamped, SoftDeletable {
  id: string
  title: string
  description?: string
  status: ProjectStatus
  clientId: string
  startDate?: string | null
  dueDate?: string | null
  tags: string[]
  budget?: number | null
  goals?: string[]
  ownerId?: string
  teamId: string
  createdBy: string
}

// ─── Task ───
export interface Task extends Timestamped, SoftDeletable {
  id: string
  title: string
  description?: string
  status: TaskStatus
  type?: string
  priority?: TaskPriority
  projectId?: string | null
  assigneeId?: string | null
  parentTaskId?: string | null
  dueDate?: string | null
  checklist: ChecklistItem[]
  tags?: string[]
  timeEstimate?: number
  timeSpent?: number
  teamId: string
  createdBy: string
}

export interface ChecklistItem {
  id: string
  title: string
  completed: boolean
}

// ─── Campaign ───
export interface Campaign extends Timestamped, SoftDeletable {
  id: string
  title: string
  description?: string
  status?: CampaignStatus
  types?: string[]
  clientId?: string | null
  projectId?: string | null
  startDate?: string | null
  endDate?: string | null
  steps: CampaignStep[]
  budget?: number
  metrics?: CampaignMetrics
  teamId: string
  userId: string
}

export interface CampaignStep {
  id: string
  title: string
  description?: string
  date: string
  assigneeId?: string | null
}

export interface CampaignMetrics {
  reach?: number
  engagement?: number
  conversions?: number
}

// ─── Note ───
export interface Note extends Timestamped, SoftDeletable {
  id: string
  title: string
  content: string
  tags?: string[]
  clientId?: string | null
  projectId?: string | null
  teamId: string
  userId: string
}

// ─── Brain Dump ───
export interface BrainDump extends Timestamped {
  id: string
  title: string
  content?: string
  tags?: string[]
  clientId?: string | null
  projectId?: string | null
  teamId: string
  userId: string
}

// ─── Calendar Event ───
export interface CalendarEvent extends Timestamped {
  id: string
  title: string
  start: string
  end?: string | null
  allDay: boolean
  description?: string
  color?: EventColor
  clientId?: string | null
  projectId?: string | null
  taskId?: string | null
  recurrence?: EventRecurrence
  reminders?: EventReminder[]
  teamId: string
  userId: string
}

export interface EventRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  endDate?: string
}

export interface EventReminder {
  type: 'email' | 'inApp'
  minutesBefore: number
}

// ─── Resource ───
export interface Resource extends Timestamped {
  id: string
  name: string
  type: string
  url: string
  description?: string
  tags: string[]
  teamId: string
  createdBy: string
  updatedBy?: string
}

// ─── API Key ───
export interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: ApiScope[]
  userId: string
  teamId: string
  createdAt: string
  lastUsedAt: string | null
  expiresAt?: string | null
}

// ─── Comment ───
export interface Comment extends Timestamped {
  id: string
  resourceType: 'task' | 'project' | 'client' | 'note'
  resourceId: string
  userId: string
  userName?: string
  content: string
}

// ─── Notification ───
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  resourceType?: string
  resourceId?: string
  createdAt: string
}

// ─── Audit Log ───
export interface AuditLog {
  id: string
  userId: string
  teamId: string
  action: string
  resourceType: string
  resourceId: string
  changes?: Record<string, { from: unknown; to: unknown }>
  timestamp: string
}

// ─── Webhook ───
export interface Webhook extends Timestamped {
  id: string
  teamId: string
  url: string
  events: string[]
  secret: string
  active: boolean
}
