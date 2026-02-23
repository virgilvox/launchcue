/**
 * Format a date object or ISO string into a human-readable format
 * @param date - The date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined, options: Intl.DateTimeFormatOptions = {}): string {
  if (!date) return ''

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  const mergedOptions: Intl.DateTimeFormatOptions = { ...defaultOptions, ...options }

  try {
    // Handle both Date objects and ISO strings
    const dateObj = date instanceof Date ? date : new Date(date)

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat('en-US', mergedOptions).format(dateObj)
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Format a date as a relative time (e.g., "2 days ago")
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return ''

  try {
    const dateObj = date instanceof Date ? date : new Date(date)

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return ''
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

    // Less than a minute
    if (diffInSeconds < 60) {
      return 'just now'
    }

    // Less than an hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
    }

    // Less than a day
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
    }

    // Less than a week
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} ${days === 1 ? 'day' : 'days'} ago`
    }

    // Default to standard date format for older dates
    return formatDate(dateObj)
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return ''
  }
}

/**
 * Format a date as a short format (May 15)
 * @param date - The date to format
 * @returns Short date string
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  return formatDate(date, { month: 'short', day: 'numeric' })
}
