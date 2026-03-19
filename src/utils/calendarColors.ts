/**
 * Calendar event color map.
 * Uses Tailwind arbitrary values that work in both light and dark modes.
 * White text on saturated backgrounds provides consistent contrast.
 */
export const calendarColorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500', text: 'text-white' },
  green: { bg: 'bg-emerald-500', text: 'text-white' },
  red: { bg: 'bg-red-500', text: 'text-white' },
  orange: { bg: 'bg-orange-500', text: 'text-white' },
  purple: { bg: 'bg-violet-500', text: 'text-white' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-950' },
  pink: { bg: 'bg-pink-500', text: 'text-white' },
  indigo: { bg: 'bg-indigo-500', text: 'text-white' },
}

/** Get bg/text classes for a calendar event color, with fallback */
export function getCalendarColor(color?: string): { bg: string; text: string } {
  return calendarColorMap[color || 'blue'] || calendarColorMap.blue
}

/** Get just the bg class for a status dot/indicator */
export function getCalendarBgClass(color?: string): string {
  return getCalendarColor(color).bg
}
