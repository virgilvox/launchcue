import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'launchcue-tooltips-seen'

interface TooltipConfig {
  id: string
  message: string
}

function getSeenTooltips(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function markTooltipSeen(id: string) {
  const seen = getSeenTooltips()
  seen.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
}

export function useTooltips() {
  const seenTooltips = ref<Set<string>>(new Set())
  const activeTooltip = ref<string | null>(null)

  onMounted(() => {
    seenTooltips.value = getSeenTooltips()
  })

  function shouldShow(id: string): boolean {
    return !seenTooltips.value.has(id)
  }

  function show(id: string) {
    if (shouldShow(id)) {
      activeTooltip.value = id
    }
  }

  function dismiss(id: string) {
    markTooltipSeen(id)
    seenTooltips.value.add(id)
    if (activeTooltip.value === id) {
      activeTooltip.value = null
    }
  }

  function dismissAll() {
    activeTooltip.value = null
  }

  return {
    activeTooltip,
    shouldShow,
    show,
    dismiss,
    dismissAll,
  }
}

// Predefined tooltip configs
export const TOOLTIPS: Record<string, TooltipConfig> = {
  SIDEBAR_GROUPS: {
    id: 'sidebar-groups',
    message: 'Navigation is now organized into groups. Click section headers to collapse them.',
  },
  SEARCH_SHORTCUT: {
    id: 'search-shortcut',
    message: 'Press Cmd+K (or Ctrl+K) to quickly search across everything.',
  },
  BRAIN_DUMP_AI: {
    id: 'brain-dump-ai',
    message: 'Brain Dump uses Claude AI to process your thoughts into organized action items.',
  },
}
