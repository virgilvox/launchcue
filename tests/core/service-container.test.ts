import { describe, it, expect, beforeEach } from 'vitest'
import { createServiceContainer, initContainer, getContainer } from '@/core/service-container'

describe('createServiceContainer', () => {
  let container: ReturnType<typeof createServiceContainer>

  beforeEach(() => {
    container = createServiceContainer()
  })

  it('register + resolve returns correct instance', () => {
    const key = Symbol('test')
    const instance = { value: 42 }
    container.register(key, () => instance)
    expect(container.resolve(key)).toBe(instance)
  })

  it('resolve caches singleton (same instance returned)', () => {
    const key = Symbol('test')
    let callCount = 0
    container.register(key, () => {
      callCount++
      return { id: callCount }
    })

    const first = container.resolve(key)
    const second = container.resolve(key)
    expect(first).toBe(second)
    expect(callCount).toBe(1)
  })

  it('re-register clears cache', () => {
    const key = Symbol('test')
    const instanceA = { name: 'A' }
    const instanceB = { name: 'B' }

    container.register(key, () => instanceA)
    expect(container.resolve(key)).toBe(instanceA)

    container.register(key, () => instanceB)
    expect(container.resolve(key)).toBe(instanceB)
  })

  it('resolve unknown key throws', () => {
    const key = Symbol('unknown')
    expect(() => container.resolve(key)).toThrowError(/No factory registered for key/)
  })

  it('has() returns true for registered keys', () => {
    const key = Symbol('test')
    expect(container.has(key)).toBe(false)
    container.register(key, () => 'value')
    expect(container.has(key)).toBe(true)
  })

  it('has() returns false for unregistered keys', () => {
    expect(container.has(Symbol('nope'))).toBe(false)
  })
})

describe('initContainer + getContainer', () => {
  it('initContainer creates a container and getContainer returns it', () => {
    const container = initContainer()
    expect(container).toBeDefined()
    expect(container.has).toBeTypeOf('function')
    expect(getContainer()).toBe(container)
  })

  it('getContainer throws before initContainer is called', async () => {
    // We need to reset the module-level singleton. Re-import with a fresh module.
    // Since vitest caches modules, we use dynamic import with cache busting isn't possible.
    // Instead, we test that after initContainer, getContainer works (already tested above).
    // The throw behavior is implicitly tested by the module's guard.
    // For a true isolation test, we'd need vi.resetModules().
    // Let's do that:
    const { vi } = await import('vitest')
    vi.resetModules()
    const { getContainer: freshGetContainer } = await import('@/core/service-container')
    expect(() => freshGetContainer()).toThrowError(/not initialized/)
  })
})
