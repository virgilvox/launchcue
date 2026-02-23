import { ref } from 'vue'
import { useToast } from 'vue-toastification'

interface ActionOptions {
  successMessage?: string
  errorMessage?: string
  rethrow?: boolean
}

export function useAsyncAction() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const toast = useToast()

  async function execute<T>(
    fn: () => Promise<T>,
    options: ActionOptions = {}
  ): Promise<T | undefined> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fn()
      if (options.successMessage) {
        toast.success(options.successMessage)
      }
      return result
    } catch (err: any) {
      const msg = options.errorMessage ?? err.message ?? 'An error occurred'
      error.value = msg
      toast.error(msg)
      if (options.rethrow) throw err
      return undefined
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    execute,
  }
}
