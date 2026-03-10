import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'

// Mock vue-router before importing composable
vi.mock('vue-router', () => ({
  onBeforeRouteLeave: vi.fn(),
}))

import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

describe('useUnsavedChanges', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with isDirty false', () => {
    const source = ref({ name: '' })
    const { isDirty } = useUnsavedChanges(() => source.value)
    expect(isDirty.value).toBe(false)
  })

  it('does not mark dirty before markLoaded()', async () => {
    const source = ref({ name: '' })
    const { isDirty } = useUnsavedChanges(() => source.value)
    source.value.name = 'changed'
    await nextTick()
    expect(isDirty.value).toBe(false)
  })

  it('marks dirty after markLoaded() and a change', async () => {
    const source = ref({ name: '' })
    const { isDirty, markLoaded } = useUnsavedChanges(() => source.value)
    markLoaded()
    vi.runAllTimers() // setTimeout inside markLoaded
    await nextTick()

    source.value.name = 'changed'
    await nextTick()
    expect(isDirty.value).toBe(true)
  })

  it('markClean() resets isDirty', async () => {
    const source = ref({ name: '' })
    const { isDirty, markLoaded, markClean } = useUnsavedChanges(() => source.value)
    markLoaded()
    vi.runAllTimers()
    await nextTick()

    source.value.name = 'changed'
    await nextTick()
    expect(isDirty.value).toBe(true)

    markClean()
    expect(isDirty.value).toBe(false)
  })

  it('does not register beforeunload handler outside onMounted', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const source = ref({ name: '' })
    useUnsavedChanges(() => source.value)
    // After Phase 1A fix, handler is deferred to onMounted — not called at composable execution time
    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function))
    addSpy.mockRestore()
  })
})
