import { ref, type Ref } from 'vue'

export function useModalState<T extends Record<string, any>>(defaultForm?: () => T) {
  const isOpen = ref(false)
  const isLoading = ref(false)
  const editingItem: Ref<any> = ref(null)
  const formData = ref(defaultForm ? defaultForm() : {}) as Ref<T>

  function open(item?: any) {
    if (item) {
      editingItem.value = item
    } else {
      editingItem.value = null
    }
    if (defaultForm && !item) {
      formData.value = defaultForm()
    }
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    isLoading.value = false
    editingItem.value = null
    if (defaultForm) {
      formData.value = defaultForm()
    }
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  return {
    isOpen,
    isLoading,
    formData,
    editingItem,
    open,
    close,
    setLoading,
  }
}
