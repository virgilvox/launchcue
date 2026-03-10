import { describe, it, expect } from 'vitest'
import { useLoadingCounter } from '@/composables/useLoadingCounter'

describe('useLoadingCounter', () => {
  it('starts with isLoading false', () => {
    const { isLoading } = useLoadingCounter()
    expect(isLoading.value).toBe(false)
  })

  it('isLoading becomes true after start()', () => {
    const { isLoading, start } = useLoadingCounter()
    start()
    expect(isLoading.value).toBe(true)
  })

  it('isLoading becomes false after matching stop()', () => {
    const { isLoading, start, stop } = useLoadingCounter()
    start()
    stop()
    expect(isLoading.value).toBe(false)
  })

  it('handles concurrent operations correctly', () => {
    const { isLoading, start, stop } = useLoadingCounter()
    start()
    start()
    expect(isLoading.value).toBe(true)
    stop()
    expect(isLoading.value).toBe(true) // still one running
    stop()
    expect(isLoading.value).toBe(false)
  })

  it('stop() does not go below zero', () => {
    const { isLoading, stop } = useLoadingCounter()
    stop()
    stop()
    expect(isLoading.value).toBe(false)
  })

  it('wrap() sets loading during async execution', async () => {
    const { isLoading, wrap } = useLoadingCounter()
    let loadingDuringExec = false

    await wrap(async () => {
      loadingDuringExec = isLoading.value
      return 'result'
    })

    expect(loadingDuringExec).toBe(true)
    expect(isLoading.value).toBe(false)
  })

  it('wrap() returns the value from the wrapped function', async () => {
    const { wrap } = useLoadingCounter()
    const result = await wrap(async () => 42)
    expect(result).toBe(42)
  })

  it('wrap() stops loading even on error', async () => {
    const { isLoading, wrap } = useLoadingCounter()

    await expect(wrap(async () => {
      throw new Error('fail')
    })).rejects.toThrow('fail')

    expect(isLoading.value).toBe(false)
  })

  it('concurrent wrap() calls keep isLoading true until all resolve', async () => {
    const { isLoading, wrap } = useLoadingCounter()
    let resolve1!: () => void
    let resolve2!: () => void

    const p1 = wrap(() => new Promise<void>(r => { resolve1 = r }))
    const p2 = wrap(() => new Promise<void>(r => { resolve2 = r }))

    expect(isLoading.value).toBe(true)

    resolve1()
    await p1
    expect(isLoading.value).toBe(true) // p2 still running

    resolve2()
    await p2
    expect(isLoading.value).toBe(false)
  })
})
