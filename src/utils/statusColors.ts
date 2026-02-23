/**
 * Centralized status → Tailwind color class mapping.
 * Replaces duplicate getStatusColor() functions across pages.
 */

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'in progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  planned: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  sent: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  revised: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'

export function getStatusColor(status: string): string {
  if (!status) return DEFAULT_COLOR
  return STATUS_COLORS[status.toLowerCase()] ?? DEFAULT_COLOR
}

export function getStatusDotColor(status: string): string {
  if (!status) return 'bg-gray-400'
  const key = status.toLowerCase()
  if (['completed', 'done', 'approved', 'active'].includes(key)) return 'bg-green-500'
  if (['in progress', 'in-progress', 'running'].includes(key)) return 'bg-blue-500'
  if (['planned', 'pending'].includes(key)) return 'bg-yellow-500'
  if (['cancelled', 'overdue'].includes(key)) return 'bg-red-500'
  return 'bg-gray-400'
}
