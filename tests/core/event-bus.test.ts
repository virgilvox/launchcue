import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createEventBus, initEventBus, getEventBus } from '@/core/event-bus'

describe('createEventBus', () => {
  let bus: ReturnType<typeof createEventBus>

  beforeEach(() => {
    bus = createEventBus()
  })

  it('on + emit calls handler with payload', () => {
    const handler = vi.fn()
    bus.on('test.event', handler)
    bus.emit('test.event', { data: 123 })
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({ data: 123 })
  })

  it('off removes handler', () => {
    const handler = vi.fn()
    bus.on('test.event', handler)
    bus.off('test.event', handler)
    bus.emit('test.event', { data: 1 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('once fires only once', () => {
    const handler = vi.fn()
    bus.once('test.event', handler)
    bus.emit('test.event', { x: 1 })
    bus.emit('test.event', { x: 2 })
    expect(handler).toHaveBeenCalledOnce()
    expect(handler).toHaveBeenCalledWith({ x: 1 })
  })

  it('emit with no handlers does not throw', () => {
    expect(() => bus.emit('nonexistent.event', { foo: 'bar' })).not.toThrow()
  })

  it('handler error does not break other handlers', () => {
    const handlerA = vi.fn(() => {
      throw new Error('boom')
    })
    const handlerB = vi.fn()

    bus.on('test.event', handlerA)
    bus.on('test.event', handlerB)
    bus.emit('test.event', { val: 1 })

    expect(handlerA).toHaveBeenCalledOnce()
    expect(handlerB).toHaveBeenCalledOnce()
  })

  it('emit without payload passes empty object', () => {
    const handler = vi.fn()
    bus.on('test.event', handler)
    bus.emit('test.event')
    expect(handler).toHaveBeenCalledWith({})
  })
})

describe('initEventBus + getEventBus', () => {
  it('initEventBus creates a bus and getEventBus returns it', () => {
    const bus = initEventBus()
    expect(bus).toBeDefined()
    expect(bus.emit).toBeTypeOf('function')
    expect(getEventBus()).toBe(bus)
  })

  it('getEventBus throws before initEventBus is called', async () => {
    vi.resetModules()
    const { getEventBus: freshGetEventBus } = await import('@/core/event-bus')
    expect(() => freshGetEventBus()).toThrowError(/not initialized/)
  })
})
