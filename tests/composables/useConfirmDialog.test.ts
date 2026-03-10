import { describe, it, expect, beforeEach } from 'vitest'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

describe('useConfirmDialog', () => {
  let dialog: ReturnType<typeof useConfirmDialog<{ id: string; name: string }>>

  beforeEach(() => {
    dialog = useConfirmDialog<{ id: string; name: string }>()
  })

  it('starts with default closed state', () => {
    expect(dialog.isOpen.value).toBe(false)
    expect(dialog.item.value).toBeNull()
    expect(dialog.isProcessing.value).toBe(false)
  })

  it('requestConfirm opens dialog and sets item', () => {
    const target = { id: '1', name: 'Test Item' }
    dialog.requestConfirm(target)

    expect(dialog.isOpen.value).toBe(true)
    expect(dialog.item.value).toEqual(target)
    expect(dialog.isProcessing.value).toBe(false)
  })

  it('confirm resolves promise with true and sets isProcessing', async () => {
    const target = { id: '1', name: 'Delete Me' }
    const promise = dialog.requestConfirm(target)

    dialog.confirm()

    const result = await promise
    expect(result).toBe(true)
    expect(dialog.isProcessing.value).toBe(true)
  })

  it('cancel resolves promise with false and clears state', async () => {
    const target = { id: '1', name: 'Nope' }
    const promise = dialog.requestConfirm(target)

    dialog.cancel()

    const result = await promise
    expect(result).toBe(false)
    expect(dialog.isOpen.value).toBe(false)
    expect(dialog.item.value).toBeNull()
    expect(dialog.isProcessing.value).toBe(false)
  })

  it('done clears state without resolving a new promise', () => {
    dialog.requestConfirm({ id: '1', name: 'Done' })
    dialog.confirm() // resolve the promise first

    dialog.done()

    expect(dialog.isOpen.value).toBe(false)
    expect(dialog.item.value).toBeNull()
    expect(dialog.isProcessing.value).toBe(false)
  })

  it('requestConfirm resets isProcessing from a previous cycle', async () => {
    const promise1 = dialog.requestConfirm({ id: '1', name: 'First' })
    dialog.confirm()
    await promise1
    expect(dialog.isProcessing.value).toBe(true)

    // New request resets isProcessing
    dialog.requestConfirm({ id: '2', name: 'Second' })
    expect(dialog.isProcessing.value).toBe(false)
  })

  it('sequential confirm then cancel cycles work independently', async () => {
    // Cycle 1: confirm
    const p1 = dialog.requestConfirm({ id: '1', name: 'Confirm me' })
    dialog.confirm()
    expect(await p1).toBe(true)
    dialog.done()

    // Cycle 2: cancel
    const p2 = dialog.requestConfirm({ id: '2', name: 'Cancel me' })
    dialog.cancel()
    expect(await p2).toBe(false)
  })

  it('calling confirm without requestConfirm does not throw', () => {
    expect(() => dialog.confirm()).not.toThrow()
    expect(dialog.isProcessing.value).toBe(true)
  })

  it('calling cancel without requestConfirm does not throw', () => {
    expect(() => dialog.cancel()).not.toThrow()
    expect(dialog.isOpen.value).toBe(false)
  })
})
