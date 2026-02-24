/**
 * Centralized status → badge class mapping.
 * Uses brutalist badge styles with 2px borders.
 */

const STATUS_COLORS: Record<string, string> = {
  completed: 'badge-green',
  done: 'badge-green',
  approved: 'badge-green',
  active: 'badge-green',
  paid: 'badge-green',
  'in progress': 'badge-blue',
  'in-progress': 'badge-blue',
  running: 'badge-blue',
  'to do': 'badge-gray',
  planned: 'badge-yellow',
  pending: 'badge-yellow',
  draft: 'badge-gray',
  cancelled: 'badge-red',
  overdue: 'badge-red',
  blocked: 'badge-red',
  sent: 'badge-purple',
  revised: 'badge-yellow',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'badge-red',
  high: 'badge-red',
  medium: 'badge-yellow',
  low: 'badge-blue',
  none: 'badge-gray',
}

const DEFAULT_COLOR = 'badge-gray'

export function getStatusColor(status: string): string {
  if (!status) return DEFAULT_COLOR
  return STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR
}

export function getStatusClasses(status: string): string {
  return getStatusColor(status)
}

export function getPriorityClasses(priority: string): string {
  if (!priority) return DEFAULT_COLOR
  return PRIORITY_COLORS[priority.toLowerCase()] ?? DEFAULT_COLOR
}

export function getStatusDotColor(status: string): string {
  if (!status) return 'bg-[var(--text-secondary)]'
  const key = status.toLowerCase()
  if (['completed', 'done', 'approved', 'active', 'paid'].includes(key)) return 'bg-[var(--success)]'
  if (['in progress', 'in-progress', 'running'].includes(key)) return 'bg-[#2563EB]'
  if (['planned', 'pending'].includes(key)) return 'bg-[var(--warning)]'
  if (['cancelled', 'overdue', 'blocked'].includes(key)) return 'bg-[var(--danger)]'
  return 'bg-[var(--text-secondary)]'
}
