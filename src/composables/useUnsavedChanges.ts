import { ref, watch, onMounted, onUnmounted, type Ref, type WatchSource } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

// Global dirty-component counter. Positive means at least one form has unsaved changes.
// Used by team-switch handler to warn before discarding work.
let _dirtyCount = 0
export function hasUnsavedChanges(): boolean {
  return _dirtyCount > 0
}

export function useUnsavedChanges(source: WatchSource, message = 'You have unsaved changes. Are you sure you want to leave?') {
  const isDirty = ref(false)
  const loaded = ref(false)

  // Keep global counter in sync with this instance's dirty state
  watch(isDirty, (dirty, wasDirty) => {
    if (dirty && !wasDirty) _dirtyCount++
    if (!dirty && wasDirty) _dirtyCount--
  })

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

  // Browser close/refresh guard — only bind when component is mounted
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = message
      return message
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnloadHandler)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
    // Decrement global counter if component is destroyed while dirty
    if (isDirty.value) _dirtyCount = Math.max(0, _dirtyCount - 1)
  })

  function markLoaded() {
    setTimeout(() => { loaded.value = true }, 0)
  }

  function markClean() {
    isDirty.value = false
  }

  return { isDirty, loaded, markLoaded, markClean }
}
