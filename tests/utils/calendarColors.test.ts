import { describe, it, expect } from 'vitest'
import {
  calendarColorMap,
  getCalendarColor,
  getCalendarBgClass,
} from '@/utils/calendarColors'

describe('calendarColors', () => {
  describe('getCalendarColor', () => {
    it('returns correct bg/text for blue', () => {
      const result = getCalendarColor('blue')
      expect(result).toEqual({ bg: 'bg-blue-500', text: 'text-white' })
    })

    it('returns correct bg/text for green', () => {
      const result = getCalendarColor('green')
      expect(result).toEqual({ bg: 'bg-emerald-500', text: 'text-white' })
    })

    it('returns correct bg/text for red', () => {
      const result = getCalendarColor('red')
      expect(result).toEqual({ bg: 'bg-red-500', text: 'text-white' })
    })

    it('returns correct bg/text for orange', () => {
      const result = getCalendarColor('orange')
      expect(result).toEqual({ bg: 'bg-orange-500', text: 'text-white' })
    })

    it('returns correct bg/text for purple', () => {
      const result = getCalendarColor('purple')
      expect(result).toEqual({ bg: 'bg-violet-500', text: 'text-white' })
    })

    it('returns correct bg/text for yellow (dark text)', () => {
      const result = getCalendarColor('yellow')
      expect(result).toEqual({ bg: 'bg-yellow-500', text: 'text-yellow-950' })
    })

    it('returns correct bg/text for pink', () => {
      const result = getCalendarColor('pink')
      expect(result).toEqual({ bg: 'bg-pink-500', text: 'text-white' })
    })

    it('returns correct bg/text for indigo', () => {
      const result = getCalendarColor('indigo')
      expect(result).toEqual({ bg: 'bg-indigo-500', text: 'text-white' })
    })

    it('returns blue as default for unknown color string', () => {
      const result = getCalendarColor('chartreuse')
      expect(result).toEqual({ bg: 'bg-blue-500', text: 'text-white' })
    })

    it('returns blue as default for undefined input', () => {
      const result = getCalendarColor(undefined)
      expect(result).toEqual({ bg: 'bg-blue-500', text: 'text-white' })
    })

    it('returns blue as default for empty string', () => {
      const result = getCalendarColor('')
      expect(result).toEqual({ bg: 'bg-blue-500', text: 'text-white' })
    })
  })

  describe('getCalendarBgClass', () => {
    it('returns just the bg class for a known color', () => {
      expect(getCalendarBgClass('red')).toBe('bg-red-500')
    })

    it('returns blue bg class for unknown color', () => {
      expect(getCalendarBgClass('neon')).toBe('bg-blue-500')
    })

    it('returns blue bg class for undefined', () => {
      expect(getCalendarBgClass(undefined)).toBe('bg-blue-500')
    })
  })

  describe('calendarColorMap completeness', () => {
    it('all defined colors have non-empty bg and text properties', () => {
      for (const [name, value] of Object.entries(calendarColorMap)) {
        expect(value.bg, `${name} should have a bg class`).toBeTruthy()
        expect(value.text, `${name} should have a text class`).toBeTruthy()
        expect(value.bg.length, `${name} bg should be non-empty`).toBeGreaterThan(0)
        expect(value.text.length, `${name} text should be non-empty`).toBeGreaterThan(0)
      }
    })

    it('has at least 8 color entries', () => {
      expect(Object.keys(calendarColorMap).length).toBeGreaterThanOrEqual(8)
    })
  })
})
