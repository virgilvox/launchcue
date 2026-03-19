import { ref } from 'vue'

const STORAGE_KEY = 'launchcue-theme'

const isDark = ref(false)

function apply() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function init() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    isDark.value = stored === 'dark'
  } else {
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  apply()
}

function toggle() {
  isDark.value = !isDark.value
  localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  apply()
}

export function useDarkMode() {
  return { isDark, toggle, init }
}
