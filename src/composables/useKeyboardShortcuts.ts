import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const showHelp = ref(false)
  const pendingKey = ref<string | null>(null)
  let pendingTimeout: ReturnType<typeof setTimeout> | null = null

  const shortcuts = [
    { keys: 'c', description: 'Create new item (context-aware)', category: 'Actions' },
    { keys: 'g → d', description: 'Go to Dashboard', category: 'Navigation' },
    { keys: 'g → t', description: 'Go to Tasks', category: 'Navigation' },
    { keys: 'g → p', description: 'Go to Projects', category: 'Navigation' },
    { keys: 'g → c', description: 'Go to Clients', category: 'Navigation' },
    { keys: 'g → n', description: 'Go to Notes', category: 'Navigation' },
    { keys: 'g → b', description: 'Go to Brain Dump', category: 'Navigation' },
    { keys: 'g → s', description: 'Go to Settings', category: 'Navigation' },
    { keys: '?', description: 'Show this help', category: 'General' },
    { keys: 'Esc', description: 'Close dialog/overlay', category: 'General' },
  ]

  function isInputFocused(): boolean {
    const active = document.activeElement
    if (!active) return false
    const tag = active.tagName.toLowerCase()
    if (['input', 'textarea', 'select'].includes(tag)) return true
    if ((active as HTMLElement).contentEditable === 'true') return true
    return false
  }

  function handleKeydown(e: KeyboardEvent) {
    if (isInputFocused()) return

    const key = e.key.toLowerCase()

    // Handle 'g' prefix for navigation chords
    if (pendingKey.value === 'g') {
      e.preventDefault()
      pendingKey.value = null
      if (pendingTimeout) clearTimeout(pendingTimeout)

      const navMap: Record<string, string> = {
        d: '/',
        t: '/tasks',
        p: '/projects',
        c: '/clients',
        n: '/notes',
        b: '/brain-dump',
        s: '/settings',
      }
      if (navMap[key]) {
        router.push(navMap[key])
      }
      return
    }

    if (key === 'g') {
      pendingKey.value = 'g'
      if (pendingTimeout) clearTimeout(pendingTimeout)
      pendingTimeout = setTimeout(() => {
        pendingKey.value = null
      }, 1000)
      return
    }

    if (key === '?') {
      e.preventDefault()
      showHelp.value = !showHelp.value
      return
    }

    if (key === 'escape') {
      showHelp.value = false
      return
    }

    // 'c' for create — dispatches custom event
    if (key === 'c') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('keyboard-create'))
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    if (pendingTimeout) clearTimeout(pendingTimeout)
  })

  return {
    showHelp,
    shortcuts,
  }
}
