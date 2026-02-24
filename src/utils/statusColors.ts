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

const DEFAULT_COLOR = 'badge-gray'

export function getStatusColor(status: string): string {
  if (!status) return DEFAULT_COLOR
  return STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR
}

