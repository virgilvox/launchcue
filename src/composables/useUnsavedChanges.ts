import { ref, watch, onUnmounted, type Ref, type WatchSource } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export function useUnsavedChanges(source: WatchSource, message = 'You have unsaved changes. Are you sure you want to leave?') {
  const isDirty = ref(false)
  const loaded = ref(false)

  // Deep watch on source data — skip until loaded
  watch(source, () => {
    if (loaded.value) {
      isDirty.value = true
    }
  }, { deep: true })

  // Route navigation guard
  onBeforeRouteLeave((_to, _from, next) => {
    if (isDirty.value) {
      const answer = window.confirm(message)
      next(answer)
    } else {
      next()
    }
  })

  // Browser close/refresh guard
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = message
      return message
    }
  }
  window.addEventListener('beforeunload', beforeUnloadHandler)

  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  })

  function markLoaded() {
    setTimeout(() => { loaded.value = true }, 0)
  }

  function markClean() {
    isDirty.value = false
  }

  return { isDirty, loaded, markLoaded, markClean }
}
