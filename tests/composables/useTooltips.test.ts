import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTooltips } from '@/composables/useTooltips'

describe('useTooltips', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shouldShow returns true for an unseen tooltip', () => {
    const { shouldShow } = useTooltips()
    expect(shouldShow('new-tip')).toBe(true)
  })

  it('shouldShow returns false after dismiss', () => {
    const { shouldShow, dismiss } = useTooltips()
    dismiss('tip-1')

    expect(shouldShow('tip-1')).toBe(false)
  })

  it('dismiss persists to localStorage and clears activeTooltip', () => {
    const { show, dismiss, activeTooltip } = useTooltips()
    show('tip-1')
    expect(activeTooltip.value).toBe('tip-1')

    dismiss('tip-1')

    expect(activeTooltip.value).toBeNull()
    const stored = JSON.parse(localStorage.getItem('launchcue-tooltips-seen')!)
    expect(stored).toContain('tip-1')
  })

  it('show sets activeTooltip for unseen tooltip', () => {
    const { show, activeTooltip } = useTooltips()
    show('tip-1')
    expect(activeTooltip.value).toBe('tip-1')
  })

  it('show does not set activeTooltip for already-seen tooltip', () => {
    const { show, dismiss, activeTooltip } = useTooltips()
    dismiss('tip-1')

    show('tip-1')

    expect(activeTooltip.value).toBeNull()
  })

  it('dismissAll clears activeTooltip', () => {
    const { show, dismissAll, activeTooltip } = useTooltips()
    show('tip-1')
    expect(activeTooltip.value).toBe('tip-1')

    dismissAll()

    expect(activeTooltip.value).toBeNull()
  })

  it('dismiss does not duplicate entries in seenTooltips', () => {
    const { shouldShow, dismiss } = useTooltips()
    dismiss('tip-1')
    dismiss('tip-1')

    // Verify localStorage only has one entry
    const stored = JSON.parse(localStorage.getItem('launchcue-tooltips-seen')!)
    const count = stored.filter((id: string) => id === 'tip-1').length
    expect(count).toBe(1)
    expect(shouldShow('tip-1')).toBe(false)
  })
})
