import { ref, computed } from 'vue'

export function useLoadingCounter() {
  const count = ref(0)
  const isLoading = computed(() => count.value > 0)

  function start() {
    count.value++
  }

  function stop() {
    count.value = Math.max(0, count.value - 1)
  }

  async function wrap<T>(fn: () => Promise<T>): Promise<T> {
    start()
    try {
      return await fn()
    } finally {
      stop()
    }
  }

  return { isLoading, start, stop, wrap }
}
