// ─── Task ───
export const TaskStatus = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
} as const
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

// ─── Project ───
export const ProjectStatus = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

// ─── Campaign ───
export const CampaignStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
} as const
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus]

// ─── Team ───
export const TeamRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const
export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole]

// ─── Calendar ───
export const EventColor = {
  BLUE: 'blue',
  GREEN: 'green',
  ORANGE: 'orange',
  RED: 'red',
  PURPLE: 'purple',
} as const
export type EventColor = (typeof EventColor)[keyof typeof EventColor]

// ─── Notifications ───
export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  DEADLINE_APPROACHING: 'deadline_approaching',
  TEAM_INVITE: 'team_invite',
  MENTION: 'mention',
  COMMENT: 'comment',
} as const
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

// ─── API Key Scopes ───
export const ApiScope = {
  READ_PROJECTS: 'read:projects',
  WRITE_PROJECTS: 'write:projects',
  READ_TASKS: 'read:tasks',
  WRITE_TASKS: 'write:tasks',
  READ_CLIENTS: 'read:clients',
  WRITE_CLIENTS: 'write:clients',
  READ_CAMPAIGNS: 'read:campaigns',
  WRITE_CAMPAIGNS: 'write:campaigns',
  READ_NOTES: 'read:notes',
  WRITE_NOTES: 'write:notes',
  READ_TEAMS: 'read:teams',
  WRITE_TEAMS: 'write:teams',
  READ_RESOURCES: 'read:resources',
  WRITE_RESOURCES: 'write:resources',
  READ_CALENDAR: 'read:calendar-events',
  WRITE_CALENDAR: 'write:calendar-events',
  READ_BRAINDUMPS: 'read:braindumps',
  WRITE_BRAINDUMPS: 'write:braindumps',
  READ_API_KEYS: 'read:api-keys',
  WRITE_API_KEYS: 'write:api-keys',
} as const
export type ApiScope = (typeof ApiScope)[keyof typeof ApiScope]

// ─── Invite ───
export const InviteStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus]
