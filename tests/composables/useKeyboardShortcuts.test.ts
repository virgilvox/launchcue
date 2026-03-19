import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'

// Mock vue-router
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

// Helper: mount a wrapper component so onMounted/onUnmounted lifecycle hooks fire
function mountShortcuts() {
  let result: ReturnType<typeof useKeyboardShortcuts>
  const wrapper = mount(
    defineComponent({
      setup() {
        result = useKeyboardShortcuts()
        return {}
      },
      template: '<div />',
    }),
  )
  return { wrapper, get result() { return result! } }
}

function fireKey(key: string, target?: EventTarget) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  if (target) {
    // Override event target by dispatching on the element
    target.dispatchEvent(event)
  } else {
    window.dispatchEvent(event)
  }
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pushMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns shortcuts list and showHelp ref', () => {
    const { result, wrapper } = mountShortcuts()
    expect(result.showHelp.value).toBe(false)
    expect(Array.isArray(result.shortcuts)).toBe(true)
    expect(result.shortcuts.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  // --- Single key shortcuts ---

  it('toggles showHelp on "?" key', () => {
    const { result, wrapper } = mountShortcuts()
    expect(result.showHelp.value).toBe(false)

    fireKey('?')
    expect(result.showHelp.value).toBe(true)

    fireKey('?')
    expect(result.showHelp.value).toBe(false)
    wrapper.unmount()
  })

  it('closes showHelp on Escape', () => {
    const { result, wrapper } = mountShortcuts()
    fireKey('?')
    expect(result.showHelp.value).toBe(true)

    fireKey('Escape')
    expect(result.showHelp.value).toBe(false)
    wrapper.unmount()
  })

  it('dispatches keyboard-create custom event on "c" key', () => {
    const { wrapper } = mountShortcuts()
    const handler = vi.fn()
    window.addEventListener('keyboard-create', handler)

    fireKey('c')
    expect(handler).toHaveBeenCalledTimes(1)

    window.removeEventListener('keyboard-create', handler)
    wrapper.unmount()
  })

  // --- Chord shortcuts (g → X) ---

  it('navigates to dashboard on g → d', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('d')
    expect(pushMock).toHaveBeenCalledWith('/')
    wrapper.unmount()
  })

  it('navigates to tasks on g → t', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('t')
    expect(pushMock).toHaveBeenCalledWith('/tasks')
    wrapper.unmount()
  })

  it('navigates to projects on g → p', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('p')
    expect(pushMock).toHaveBeenCalledWith('/projects')
    wrapper.unmount()
  })

  it('navigates to clients on g → c', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('c')
    expect(pushMock).toHaveBeenCalledWith('/clients')
    wrapper.unmount()
  })

  it('navigates to notes on g → n', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('n')
    expect(pushMock).toHaveBeenCalledWith('/notes')
    wrapper.unmount()
  })

  it('navigates to brain dump on g → b', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('b')
    expect(pushMock).toHaveBeenCalledWith('/brain-dump')
    wrapper.unmount()
  })

  it('navigates to settings on g → s', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('s')
    expect(pushMock).toHaveBeenCalledWith('/settings')
    wrapper.unmount()
  })

  it('does not navigate if chord second key is unknown', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')
    fireKey('z')
    expect(pushMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('chord times out after 1 second', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')

    vi.advanceTimersByTime(1100)

    // After timeout, pressing 'd' should not navigate
    fireKey('d')
    expect(pushMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('chord works within the 1 second window', () => {
    const { wrapper } = mountShortcuts()
    fireKey('g')

    vi.advanceTimersByTime(500) // still within window

    fireKey('d')
    expect(pushMock).toHaveBeenCalledWith('/')
    wrapper.unmount()
  })

  // --- Input focus suppression ---

  it('ignores shortcuts when an input is focused', () => {
    const { result, wrapper } = mountShortcuts()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    fireKey('?')
    expect(result.showHelp.value).toBe(false)

    document.body.removeChild(input)
    wrapper.unmount()
  })

  it('ignores shortcuts when a textarea is focused', () => {
    const { result, wrapper } = mountShortcuts()
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()

    fireKey('?')
    expect(result.showHelp.value).toBe(false)

    document.body.removeChild(textarea)
    wrapper.unmount()
  })

  it('ignores shortcuts when a select is focused', () => {
    const { result, wrapper } = mountShortcuts()
    const select = document.createElement('select')
    document.body.appendChild(select)
    select.focus()

    fireKey('?')
    expect(result.showHelp.value).toBe(false)

    document.body.removeChild(select)
    wrapper.unmount()
  })

  it('ignores shortcuts when contentEditable element is focused', () => {
    const { result, wrapper } = mountShortcuts()
    const div = document.createElement('div')
    div.contentEditable = 'true'
    document.body.appendChild(div)
    div.focus()

    fireKey('?')
    expect(result.showHelp.value).toBe(false)

    document.body.removeChild(div)
    wrapper.unmount()
  })

  // --- Cleanup on unmount ---

  it('removes keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { wrapper } = mountShortcuts()

    wrapper.unmount()

    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('does not respond to keys after unmount', () => {
    const { result, wrapper } = mountShortcuts()
    wrapper.unmount()

    fireKey('?')
    expect(result.showHelp.value).toBe(false)
  })

  it('clears pending chord timeout on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    const { wrapper } = mountShortcuts()

    fireKey('g') // start a chord, sets pendingTimeout
    const callsBefore = clearSpy.mock.calls.length

    wrapper.unmount()

    // clearTimeout should have been called during unmount cleanup
    expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBefore)
    clearSpy.mockRestore()
  })
})
