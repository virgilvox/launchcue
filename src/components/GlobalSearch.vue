<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0" style="background-color: rgba(0, 0, 0, 0.6);" @click="close"></div>

        <!-- Search Panel -->
        <div
          class="relative w-full max-w-2xl mx-4 border-2 overflow-hidden"
          style="background-color: var(--surface-elevated); border-color: var(--border); box-shadow: 6px 6px 0 0 var(--shadow-color);"
          @click.stop
        >
          <!-- Search Input -->
          <div class="flex items-center px-4 border-b-2" style="border-color: var(--border);">
            <MagnifyingGlassIcon v-if="!isCommandMode" class="h-5 w-5 shrink-0" style="color: var(--text-secondary);" />
            <CommandLineIcon v-else class="h-5 w-5 shrink-0" style="color: var(--accent-primary);" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              :placeholder="isCommandMode ? 'Type a command...' : 'Search tasks, projects, clients, notes...'"
              class="w-full px-3 py-4 bg-transparent focus:outline-none font-sans"
              style="color: var(--text-primary);"
              @keydown.escape="close"
              @keydown.down.prevent="navigateDown"
              @keydown.up.prevent="navigateUp"
              @keydown.enter.prevent="selectFocused"
            />
            <div class="flex items-center gap-2">
              <span
                v-if="isCommandMode"
                class="badge badge-coral text-[10px]"
              >
                CMD
              </span>
              <kbd
                class="hidden sm:inline-flex items-center px-2 py-1 mono text-[10px] font-bold border-2"
                style="border-color: var(--border-light); color: var(--text-secondary);"
              >
                ESC
              </kbd>
            </div>
          </div>

          <!-- Results Area -->
          <div class="max-h-[60vh] overflow-y-auto">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-8">
              <svg class="animate-spin h-5 w-5" style="color: var(--accent-primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="ml-2 text-body-sm" style="color: var(--text-secondary);">Searching...</span>
            </div>

            <!-- Command Mode Results -->
            <div v-else-if="isCommandMode">
              <div v-if="filteredCommands.length === 0" class="py-8 text-center">
                <p class="text-body-sm" style="color: var(--text-secondary);">No matching commands</p>
              </div>
              <div v-else>
                <!-- Command Group Headers -->
                <div
                  v-for="group in commandGroups"
                  :key="group.label"
                >
                  <div class="px-4 py-2 border-b" style="background-color: var(--surface); border-color: var(--border-light);">
                    <span class="overline">{{ group.label }}</span>
                  </div>
                  <button
                    v-for="(cmd, idx) in group.items"
                    :key="cmd.id"
                    class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 border-b"
                    :class="focusedIndex === getCommandGlobalIndex(group.label, idx) ? 'search-result-focused' : 'search-result'"
                    style="border-color: var(--border-light);"
                    @click="executeCommand(cmd)"
                    @mouseenter="focusedIndex = getCommandGlobalIndex(group.label, idx)"
                  >
                    <div
                      class="shrink-0 flex items-center justify-center w-8 h-8 border-2"
                      :style="`border-color: var(--border); background-color: ${cmd.iconBg};`"
                    >
                      <component :is="cmd.icon" class="h-4 w-4" :style="`color: ${cmd.iconColor};`" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-body-sm font-medium" style="color: var(--text-primary);">
                        {{ cmd.label }}
                      </p>
                      <p v-if="cmd.description" class="text-caption mono mt-0.5">
                        {{ cmd.description }}
                      </p>
                    </div>
                    <kbd
                      v-if="cmd.shortcut"
                      class="shrink-0 mono text-[10px] font-bold px-1.5 py-0.5 border-2"
                      style="border-color: var(--border-light); color: var(--text-secondary);"
                    >
                      {{ cmd.shortcut }}
                    </kbd>
                    <ChevronRightIcon class="h-4 w-4 shrink-0" style="color: var(--text-secondary);" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State (query entered but no results) -->
            <div
              v-else-if="searchQuery.length >= 2 && !isLoading && groupedResults.length === 0 && hasSearched"
              class="py-8 text-center"
            >
              <MagnifyingGlassIcon class="h-10 w-10 mx-auto mb-3" style="color: var(--border-light);" />
              <p class="text-body-sm" style="color: var(--text-secondary);">No results for "<strong>{{ searchQuery }}</strong>"</p>
              <p class="text-caption mono mt-2" style="color: var(--text-secondary);">
                Try <button class="font-bold hover:underline" style="color: var(--accent-primary);" @click="searchQuery = '>'">typing &gt;</button> for commands
              </p>
            </div>

            <!-- Initial State -->
            <div
              v-else-if="searchQuery.length < 2 && !isLoading"
              class="py-8 text-center"
            >
              <p class="text-body-sm" style="color: var(--text-secondary);">Type to search or <kbd class="mono text-[10px] font-bold px-1 py-0.5 border-2" style="border-color: var(--border-light);">&gt;</kbd> for commands</p>
            </div>

            <!-- Results grouped by type -->
            <div v-else>
              <div
                v-for="group in groupedResults"
                :key="group.type"
              >
                <!-- Group Header -->
                <div class="px-4 py-2 border-b" style="background-color: var(--surface); border-color: var(--border-light);">
                  <span class="overline">{{ group.label }}</span>
                </div>

                <!-- Group Items -->
                <button
                  v-for="(result, idx) in group.items"
                  :key="result.id"
                  class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 border-b"
                  :class="focusedIndex === getGlobalIndex(group.type, idx) ? 'search-result-focused' : 'search-result'"
                  style="border-color: var(--border-light);"
                  @click="navigateTo(result)"
                  @mouseenter="focusedIndex = getGlobalIndex(group.type, idx)"
                >
                  <!-- Type Icon -->
                  <div
                    class="shrink-0 flex items-center justify-center w-8 h-8 border-2"
                    :style="typeIconStyle[result.type]"
                  >
                    <component :is="typeIcons[result.type]" class="h-4 w-4" />
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <p class="text-body-sm font-medium" style="color: var(--text-primary);">
                      {{ result.title }}
                    </p>
                    <p
                      v-if="result.description"
                      class="text-caption mono mt-0.5"
                    >
                      {{ truncateText(result.description, 100) }}
                    </p>
                  </div>

                  <!-- Status badge -->
                  <span
                    v-if="result.status"
                    class="badge badge-gray shrink-0"
                  >
                    {{ result.status }}
                  </span>

                  <ChevronRightIcon class="h-4 w-4 shrink-0" style="color: var(--text-secondary);" />
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            v-if="groupedResults.length > 0 || (isCommandMode && filteredCommands.length > 0)"
            class="px-4 py-2 border-t-2 flex items-center justify-between"
            style="border-color: var(--border); background-color: var(--surface);"
          >
            <div class="flex items-center gap-2 text-caption mono">
              <kbd class="px-1.5 py-0.5 border-2 text-[10px] font-bold" style="border-color: var(--border-light);">↑↓</kbd>
              <span style="color: var(--text-secondary);">navigate</span>
              <kbd class="px-1.5 py-0.5 border-2 text-[10px] font-bold ml-2" style="border-color: var(--border-light);">↵</kbd>
              <span style="color: var(--text-secondary);">{{ isCommandMode ? 'run' : 'open' }}</span>
            </div>
            <span class="mono text-caption" style="color: var(--text-secondary);">
              {{ isCommandMode ? filteredCommands.length + ' command' + (filteredCommands.length !== 1 ? 's' : '') : totalResults + ' result' + (totalResults !== 1 ? 's' : '') }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import apiService from '../services/api.service'
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  UserGroupIcon,
  DocumentTextIcon,
  MegaphoneIcon,
  PlusIcon,
  CalendarIcon,
  Cog6ToothIcon,
  SunIcon,
  LightBulbIcon,
  CommandLineIcon,
  HomeIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const toast = useToast()

const isOpen = ref(false)
const searchQuery = ref('')
const results = ref([])
const isLoading = ref(false)
const hasSearched = ref(false)
const focusedIndex = ref(-1)
const searchInput = ref(null)
const previousActiveElement = ref(null)

let debounceTimer = null

// Command mode detection
const isCommandMode = computed(() => searchQuery.value.startsWith('>'))
const commandQuery = computed(() =>
  isCommandMode.value ? searchQuery.value.slice(1).trim().toLowerCase() : ''
)

// Commands
const commands = [
  { id: 'new-task', label: 'New Task', description: 'Create a new task', icon: PlusIcon, iconBg: 'var(--accent-hot-wash)', iconColor: 'var(--accent-hot)', shortcut: 'C', category: 'Create', action: () => router.push('/tasks?action=new') },
  { id: 'new-client', label: 'New Client', description: 'Add a new client', icon: UsersIcon, iconBg: 'var(--accent-hot-wash)', iconColor: 'var(--accent-hot)', shortcut: null, category: 'Create', action: () => router.push('/clients?action=new') },
  { id: 'new-project', label: 'New Project', description: 'Start a new project', icon: FolderIcon, iconBg: 'var(--accent-hot-wash)', iconColor: 'var(--accent-hot)', shortcut: null, category: 'Create', action: () => router.push('/projects?action=new') },
  { id: 'new-note', label: 'New Note', description: 'Write a new note', icon: DocumentTextIcon, iconBg: 'var(--accent-hot-wash)', iconColor: 'var(--accent-hot)', shortcut: null, category: 'Create', action: () => router.push('/notes?action=new') },
  { id: 'go-dashboard', label: 'Go to Dashboard', description: null, icon: HomeIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → D', category: 'Navigate', action: () => router.push('/') },
  { id: 'go-tasks', label: 'Go to Tasks', description: null, icon: ClipboardDocumentListIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → T', category: 'Navigate', action: () => router.push('/tasks') },
  { id: 'go-projects', label: 'Go to Projects', description: null, icon: FolderIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → P', category: 'Navigate', action: () => router.push('/projects') },
  { id: 'go-clients', label: 'Go to Clients', description: null, icon: UserGroupIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → C', category: 'Navigate', action: () => router.push('/clients') },
  { id: 'go-calendar', label: 'Go to Calendar', description: null, icon: CalendarIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: null, category: 'Navigate', action: () => router.push('/calendar') },
  { id: 'go-notes', label: 'Go to Notes', description: null, icon: DocumentTextIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → N', category: 'Navigate', action: () => router.push('/notes') },
  { id: 'go-braindump', label: 'Go to Brain Dump', description: null, icon: LightBulbIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → B', category: 'Navigate', action: () => router.push('/brain-dump') },
  { id: 'go-settings', label: 'Go to Settings', description: null, icon: Cog6ToothIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: 'G → S', category: 'Navigate', action: () => router.push('/settings') },
  { id: 'toggle-dark', label: 'Toggle Dark Mode', description: 'Switch between light and dark theme', icon: SunIcon, iconBg: 'transparent', iconColor: 'var(--text-secondary)', shortcut: null, category: 'System', action: () => document.documentElement.classList.toggle('dark') },
]

const filteredCommands = computed(() => {
  if (!commandQuery.value) return commands
  return commands.filter(cmd =>
    cmd.label.toLowerCase().includes(commandQuery.value) ||
    (cmd.description && cmd.description.toLowerCase().includes(commandQuery.value))
  )
})

const commandGroups = computed(() => {
  const groups = {}
  for (const cmd of filteredCommands.value) {
    if (!groups[cmd.category]) {
      groups[cmd.category] = { label: cmd.category, items: [] }
    }
    groups[cmd.category].items.push(cmd)
  }
  const order = ['Create', 'Navigate', 'System']
  return order.filter(cat => groups[cat]).map(cat => groups[cat])
})

function getCommandGlobalIndex(groupLabel, localIdx) {
  let offset = 0
  for (const group of commandGroups.value) {
    if (group.label === groupLabel) return offset + localIdx
    offset += group.items.length
  }
  return -1
}

function executeCommand(cmd) {
  close()
  cmd.action()
}

// Type configuration for search results
const typeIcons = {
  task: ClipboardDocumentListIcon,
  project: FolderIcon,
  client: UserGroupIcon,
  note: DocumentTextIcon,
  campaign: MegaphoneIcon,
}

const typeIconStyle = {
  task: 'border-color: var(--border); background-color: var(--accent-primary-wash); color: var(--accent-primary);',
  project: 'border-color: var(--border); background-color: var(--accent-primary-wash); color: var(--accent-primary);',
  client: 'border-color: var(--border); background-color: var(--accent-primary-wash); color: var(--success);',
  note: 'border-color: var(--border); background-color: var(--accent-hot-wash); color: var(--warning);',
  campaign: 'border-color: var(--border); background-color: var(--accent-hot-wash); color: var(--accent-hot);',
}

const typeLabels = {
  task: 'Tasks',
  project: 'Projects',
  client: 'Clients',
  note: 'Notes',
  campaign: 'Campaigns',
}

const typeOrder = ['task', 'project', 'client', 'note', 'campaign']

// Grouped results
const groupedResults = computed(() => {
  const groups = {}
  for (const result of results.value) {
    if (!groups[result.type]) {
      groups[result.type] = {
        type: result.type,
        label: typeLabels[result.type] || result.type,
        items: [],
      }
    }
    groups[result.type].items.push(result)
  }
  return typeOrder.filter((type) => groups[type]).map((type) => groups[type])
})

const totalResults = computed(() => results.value.length)

const flatResults = computed(() => {
  const flat = []
  for (const group of groupedResults.value) {
    for (const item of group.items) {
      flat.push(item)
    }
  }
  return flat
})

function getGlobalIndex(type, localIdx) {
  let offset = 0
  for (const group of groupedResults.value) {
    if (group.type === type) return offset + localIdx
    offset += group.items.length
  }
  return -1
}

// Search with debounce
watch(searchQuery, (newVal) => {
  clearTimeout(debounceTimer)
  focusedIndex.value = -1

  // Skip search in command mode
  if (newVal.startsWith('>')) {
    results.value = []
    hasSearched.value = false
    isLoading.value = false
    return
  }

  if (newVal.trim().length < 2) {
    results.value = []
    hasSearched.value = false
    isLoading.value = false
    return
  }

  isLoading.value = true
  debounceTimer = setTimeout(() => {
    performSearch(newVal.trim())
  }, 300)
})

async function performSearch(query) {
  try {
    isLoading.value = true
    const response = await apiService.search(query)
    results.value = response.results || []
    hasSearched.value = true
  } catch (error) {
    toast.error('Search failed. Please try again.')
    results.value = []
    hasSearched.value = true
  } finally {
    isLoading.value = false
  }
}

// Navigation
function navigateTo(result) {
  const routeMap = {
    task: { name: 'task-detail', params: { id: result.id } },
    project: { name: 'project-detail', params: { id: result.id } },
    client: { name: 'client-detail', params: { id: result.id } },
    note: { name: 'notes' },
    campaign: { name: 'campaign-detail', params: { id: result.id } },
  }

  const route = routeMap[result.type]
  if (route) {
    close()
    router.push(route)
  }
}

function navigateDown() {
  const total = isCommandMode.value ? filteredCommands.value.length : flatResults.value.length
  if (total === 0) return
  focusedIndex.value = (focusedIndex.value + 1) % total
}

function navigateUp() {
  const total = isCommandMode.value ? filteredCommands.value.length : flatResults.value.length
  if (total === 0) return
  focusedIndex.value =
    focusedIndex.value <= 0 ? total - 1 : focusedIndex.value - 1
}

function selectFocused() {
  if (isCommandMode.value) {
    if (focusedIndex.value >= 0 && focusedIndex.value < filteredCommands.value.length) {
      executeCommand(filteredCommands.value[focusedIndex.value])
    }
  } else {
    if (focusedIndex.value >= 0 && focusedIndex.value < flatResults.value.length) {
      navigateTo(flatResults.value[focusedIndex.value])
    }
  }
}

// Open/close
function open() {
  previousActiveElement.value = document.activeElement
  isOpen.value = true
  searchQuery.value = ''
  results.value = []
  hasSearched.value = false
  focusedIndex.value = -1
  nextTick(() => {
    searchInput.value?.focus()
  })
}

function close() {
  isOpen.value = false
  searchQuery.value = ''
  results.value = []
  hasSearched.value = false
  if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function') {
    nextTick(() => {
      previousActiveElement.value.focus()
      previousActiveElement.value = null
    })
  }
}

// Utility
function truncateText(text, maxLength) {
  if (!text) return ''
  const clean = text.replace(/<[^>]*>/g, '')
  if (clean.length <= maxLength) return clean
  return clean.substring(0, maxLength) + '...'
}

// Keyboard shortcut: Cmd+K / Ctrl+K
function handleKeydown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  clearTimeout(debounceTimer)
})

defineExpose({ open, close })
</script>

<style scoped>
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.15s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

.search-result {
  background-color: transparent;
}

.search-result:hover {
  background-color: var(--surface);
}

.search-result-focused {
  background-color: var(--accent-primary-wash);
}
</style>
