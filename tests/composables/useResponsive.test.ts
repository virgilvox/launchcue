import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// We mock @vueuse/core's useMediaQuery to control breakpoint values
const mobileMatch = ref(false)
const tabletMatch = ref(false)
const desktopMatch = ref(true)

vi.mock('@vueuse/core', () => ({
  useMediaQuery: vi.fn((query: string) => {
    if (query === '(max-width: 767px)') return mobileMatch
    if (query === '(min-width: 768px) and (max-width: 1023px)') return tabletMatch
    if (query === '(min-width: 1024px)') return desktopMatch
    return ref(false)
  }),
}))

import { useResponsive } from '@/composables/useResponsive'
import { useMediaQuery } from '@vueuse/core'

describe('useResponsive', () => {
  beforeEach(() => {
    mobileMatch.value = false
    tabletMatch.value = false
    desktopMatch.value = true
  })

  it('returns isMobile, isTablet, isDesktop refs', () => {
    const { isMobile, isTablet, isDesktop } = useResponsive()
    expect(isMobile).toBeDefined()
    expect(isTablet).toBeDefined()
    expect(isDesktop).toBeDefined()
  })

  it('detects desktop by default', () => {
    const { isMobile, isTablet, isDesktop } = useResponsive()
    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(false)
    expect(isDesktop.value).toBe(true)
  })

  it('detects mobile breakpoint', () => {
    mobileMatch.value = true
    desktopMatch.value = false

    const { isMobile, isTablet, isDesktop } = useResponsive()
    expect(isMobile.value).toBe(true)
    expect(isTablet.value).toBe(false)
    expect(isDesktop.value).toBe(false)
  })

  it('detects tablet breakpoint', () => {
    tabletMatch.value = true
    desktopMatch.value = false

    const { isMobile, isTablet, isDesktop } = useResponsive()
    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(true)
    expect(isDesktop.value).toBe(false)
  })

  it('reacts to breakpoint changes', () => {
    const { isMobile, isDesktop } = useResponsive()
    expect(isDesktop.value).toBe(true)
    expect(isMobile.value).toBe(false)

    // Simulate resizing to mobile
    desktopMatch.value = false
    mobileMatch.value = true

    expect(isDesktop.value).toBe(false)
    expect(isMobile.value).toBe(true)
  })

  it('calls useMediaQuery with correct breakpoint queries', () => {
    useResponsive()
    expect(useMediaQuery).toHaveBeenCalledWith('(max-width: 767px)')
    expect(useMediaQuery).toHaveBeenCalledWith('(min-width: 768px) and (max-width: 1023px)')
    expect(useMediaQuery).toHaveBeenCalledWith('(min-width: 1024px)')
  })
})
