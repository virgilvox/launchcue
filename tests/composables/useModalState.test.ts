import { describe, it, expect, beforeEach } from 'vitest'
import { useModalState } from '@/composables/useModalState'

describe('useModalState', () => {
  it('starts closed with null editingItem', () => {
    const modal = useModalState()
    expect(modal.isOpen.value).toBe(false)
    expect(modal.isLoading.value).toBe(false)
    expect(modal.editingItem.value).toBeNull()
  })

  it('open() without item sets isOpen true and editingItem null', () => {
    const modal = useModalState()
    modal.open()

    expect(modal.isOpen.value).toBe(true)
    expect(modal.editingItem.value).toBeNull()
  })

  it('open(item) sets editingItem to the provided item', () => {
    const modal = useModalState()
    const item = { id: '1', name: 'Test' }
    modal.open(item)

    expect(modal.isOpen.value).toBe(true)
    expect(modal.editingItem.value).toEqual(item)
  })

  it('close() resets all state', () => {
    const modal = useModalState()
    modal.open({ id: '1', name: 'Open' })
    modal.setLoading(true)

    modal.close()

    expect(modal.isOpen.value).toBe(false)
    expect(modal.isLoading.value).toBe(false)
    expect(modal.editingItem.value).toBeNull()
  })

  it('setLoading toggles isLoading', () => {
    const modal = useModalState()
    modal.setLoading(true)
    expect(modal.isLoading.value).toBe(true)

    modal.setLoading(false)
    expect(modal.isLoading.value).toBe(false)
  })

  describe('with defaultForm factory', () => {
    const defaultForm = () => ({ title: '', priority: 'medium' })

    it('initializes formData from defaultForm', () => {
      const modal = useModalState(defaultForm)
      expect(modal.formData.value).toEqual({ title: '', priority: 'medium' })
    })

    it('close() resets formData via defaultForm', () => {
      const modal = useModalState(defaultForm)
      modal.formData.value.title = 'Changed'
      modal.open()

      modal.close()

      expect(modal.formData.value).toEqual({ title: '', priority: 'medium' })
    })

    it('open() without item resets formData via defaultForm', () => {
      const modal = useModalState(defaultForm)
      modal.formData.value.title = 'Dirty'

      modal.open()

      expect(modal.formData.value).toEqual({ title: '', priority: 'medium' })
    })

    it('open(item) does not reset formData', () => {
      const modal = useModalState(defaultForm)
      modal.formData.value.title = 'Existing'

      modal.open({ id: '1' })

      // formData is not reset when editing an existing item
      expect(modal.formData.value.title).toBe('Existing')
    })

    it('defaultForm returns a new object each time (no shared references)', () => {
      const modal = useModalState(defaultForm)
      modal.open()
      const firstFormData = modal.formData.value

      modal.close()
      const secondFormData = modal.formData.value

      expect(firstFormData).not.toBe(secondFormData)
      expect(secondFormData).toEqual({ title: '', priority: 'medium' })
    })
  })
})
