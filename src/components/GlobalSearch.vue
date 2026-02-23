<template>
  <Teleport to="body">
    <Transition name="search-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
        @click.self="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="close"></div>

        <!-- Search Panel -->
        <div
          class="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          @click.stop
        >
          <!-- Search Input -->
          <div class="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
            <MagnifyingGlassIcon class="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" />
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              placeholder="Search tasks, projects, clients, notes, campaigns..."
              class="w-full px-3 py-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base"
              @keydown.escape="close"
              @keydown.down.prevent="navigateDown"
              @keydown.up.prevent="navigateUp"
              @keydown.enter.prevent="selectFocused"
            />
            <kbd
              class="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
            >
              ESC
            </kbd>
          </div>

          <!-- Results Area -->
          <div class="max-h-[60vh] overflow-y-auto">
            <!-- Loading State -->
            <div v-if="isLoading" class="flex items-center justify-center py-8">
              <svg class="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">Searching...</span>
            </div>

            <!-- Empty State (query entered but no results) -->
            <div
              v-else-if="searchQuery.length >= 2 && !isLoading && groupedResults.length === 0 && hasSearched"
              class="py-8 text-center"
            >
              <MagnifyingGlassIcon class="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p class="text-sm text-gray-500 dark:text-gray-400">No results found for "{{ searchQuery }}"</p>
            </div>

            <!-- Initial State -->
            <div
              v-else-if="searchQuery.length < 2 && !isLoading"
              class="py-8 text-center"
            >
              <p class="text-sm text-gray-400 dark:text-gray-500">Type at least 2 characters to search</p>
            </div>

            <!-- Results grouped by type -->
            <div v-else>
              <div
                v-for="group in groupedResults"
                :key="group.type"
                class="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <!-- Group Header -->
                <div class="px-4 py-2 bg-gray-50 dark:bg-gray-750 sticky top-0">
                  <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {{ group.label }}
                  </span>
                </div>

                <!-- Group Items -->
                <button
                  v-for="(result, idx) in group.items"
                  :key="result.id"
                  class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100"
                  :class="[
                    focusedIndex === getGlobalIndex(group.type, idx)
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                  ]"
                  @click="navigateTo(result)"
                  @mouseenter="focusedIndex = getGlobalIndex(group.type, idx)"
                >
                  <!-- Type Icon -->
                  <div
                    class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
                    :class="typeIconClasses[result.type]"
                  >
                    <component :is="typeIcons[result.type]" class="h-4 w-4" />
                  </div>

                  <!-- Content -->
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ result.title }}
                    </p>
                    <p
                      v-if="result.description"
                      class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                    >
                      {{ truncateText(result.description, 100) }}
                    </p>
                  </div>

                  <!-- Status badge (for tasks/projects) -->
                  <span
                    v-if="result.status"
                    class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {{ result.status }}
                  </span>

                  <!-- Arrow indicator -->
                  <ChevronRightIcon class="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            v-if="groupedResults.length > 0"
            class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500"
          >
            <div class="flex items-center gap-2">
              <kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px] ml-2">↵</kbd>
              <span>open</span>
            </div>
            <span>{{ totalResults }} result{{ totalResults !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import apiService from '../services/api.service'
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  UserGroupIcon,
  DocumentTextIcon,
  MegaphoneIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()

const isOpen = ref(false)
const searchQuery = ref('')
const results = ref([])
const isLoading = ref(false)
const hasSearched = ref(false)
const focusedIndex = ref(-1)
const searchInput = ref(null)

let debounceTimer = null

// Type configuration
const typeIcons = {
  task: ClipboardDocumentListIcon,
  project: FolderIcon,
  client: UserGroupIcon,
  note: DocumentTextIcon,
  campaign: MegaphoneIcon,
}

const typeIconClasses = {
  task: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
  project: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  client: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
  note: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  campaign: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
}

const typeLabels = {
  task: 'Tasks',
  project: 'Projects',
  client: 'Clients',
  note: 'Notes',
  campaign: 'Campaigns',
}

// Group order for consistent display
const typeOrder = ['task', 'project', 'client', 'note', 'campaign']

// Grouped results computed
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

  // Return in consistent order
  return typeOrder.filter((type) => groups[type]).map((type) => groups[type])
})

const totalResults = computed(() => results.value.length)

// Flattened list for keyboard navigation
const flatResults = computed(() => {
  const flat = []
  for (const group of groupedResults.value) {
    for (const item of group.items) {
      flat.push(item)
    }
  }
  return flat
})

// Get the global index for an item within a group
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
    console.error('Search failed:', error)
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
  if (flatResults.value.length === 0) return
  focusedIndex.value = (focusedIndex.value + 1) % flatResults.value.length
}

function navigateUp() {
  if (flatResults.value.length === 0) return
  focusedIndex.value =
    focusedIndex.value <= 0
      ? flatResults.value.length - 1
      : focusedIndex.value - 1
}

function selectFocused() {
  if (focusedIndex.value >= 0 && focusedIndex.value < flatResults.value.length) {
    navigateTo(flatResults.value[focusedIndex.value])
  }
}

// Open/close
function open() {
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
}

// Utility
function truncateText(text, maxLength) {
  if (!text) return ''
  // Strip HTML tags for clean display
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

// Expose open method for parent components
defineExpose({ open, close })
</script>

<style scoped>
/* Transition for the overlay */
.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.15s ease;
}

.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}

/* Custom dark background for group headers and footer */
.dark .bg-gray-750 {
  background-color: rgb(42, 48, 60);
}
</style>
