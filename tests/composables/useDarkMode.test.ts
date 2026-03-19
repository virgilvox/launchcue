import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDarkMode } from '@/composables/useDarkMode'

const STORAGE_KEY = 'launchcue-theme'

describe('useDarkMode', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    // Reset isDark to a known state for module-level ref isolation
    const { isDark } = useDarkMode()
    isDark.value = false
    document.documentElement.classList.remove('dark')
    localStorage.clear()
    window.matchMedia = originalMatchMedia
  })

  function mockMatchMedia(matches: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as any
  }

  describe('init()', () => {
    it('reads "dark" from localStorage and sets isDark to true', () => {
      localStorage.setItem(STORAGE_KEY, 'dark')
      const { init, isDark } = useDarkMode()

      init()

      expect(isDark.value).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('reads "light" from localStorage and sets isDark to false', () => {
      localStorage.setItem(STORAGE_KEY, 'light')
      const { init, isDark } = useDarkMode()

      init()

      expect(isDark.value).toBe(false)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('falls back to system preference when localStorage is empty (prefers dark)', () => {
      mockMatchMedia(true)
      const { init, isDark } = useDarkMode()

      init()

      expect(isDark.value).toBe(true)
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('falls back to system preference when localStorage is empty (prefers light)', () => {
      mockMatchMedia(false)
      const { init, isDark } = useDarkMode()

      init()

      expect(isDark.value).toBe(false)
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('toggle()', () => {
    it('flips isDark from false to true', () => {
      mockMatchMedia(false)
      const { init, toggle, isDark } = useDarkMode()
      init()
      expect(isDark.value).toBe(false)

      toggle()

      expect(isDark.value).toBe(true)
    })

    it('flips isDark from true to false', () => {
      localStorage.setItem(STORAGE_KEY, 'dark')
      const { init, toggle, isDark } = useDarkMode()
      init()
      expect(isDark.value).toBe(true)

      toggle()

      expect(isDark.value).toBe(false)
    })

    it('persists "dark" to localStorage when toggled on', () => {
      mockMatchMedia(false)
      const { init, toggle } = useDarkMode()
      init()

      toggle()

      expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
    })

    it('persists "light" to localStorage when toggled off', () => {
      localStorage.setItem(STORAGE_KEY, 'dark')
      const { init, toggle } = useDarkMode()
      init()

      toggle()

      expect(localStorage.getItem(STORAGE_KEY)).toBe('light')
    })

    it('adds "dark" class to documentElement when toggled on', () => {
      mockMatchMedia(false)
      const { init, toggle } = useDarkMode()
      init()
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      toggle()

      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('removes "dark" class from documentElement when toggled off', () => {
      localStorage.setItem(STORAGE_KEY, 'dark')
      const { init, toggle } = useDarkMode()
      init()
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      toggle()

      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })
})
