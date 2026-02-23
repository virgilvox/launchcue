import { ref, type Ref } from 'vue'

export function useConfirmDialog<T = any>() {
  const isOpen = ref(false)
  const item: Ref<T | null> = ref(null)
  const isProcessing = ref(false)

  let _resolve: ((confirmed: boolean) => void) | null = null

  function requestConfirm(target: T): Promise<boolean> {
    item.value = target
    isOpen.value = true
    isProcessing.value = false
    return new Promise<boolean>(resolve => {
      _resolve = resolve
    })
  }

  function confirm() {
    isProcessing.value = true
    _resolve?.(true)
    _resolve = null
  }

  function cancel() {
    isOpen.value = false
    item.value = null
    isProcessing.value = false
    _resolve?.(false)
    _resolve = null
  }

  function done() {
    isOpen.value = false
    item.value = null
    isProcessing.value = false
  }

  return {
    isOpen,
    item,
    isProcessing,
    requestConfirm,
    confirm,
    cancel,
    done,
  }
}
