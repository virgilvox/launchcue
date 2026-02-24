<template>
  <!-- Mobile backdrop -->
  <Transition name="sidebar-backdrop">
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-black/60 z-30"
      @click="closeMobile"
    ></div>
  </Transition>

  <!-- Sidebar -->
  <Transition :name="isMobile ? 'sidebar-slide' : undefined">
    <div
      v-show="!isMobile || isOpen"
      :class="[
        'flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] transition-all duration-300 ease-in-out shrink-0',
        isMobile ? 'fixed inset-y-0 left-0 z-40 w-64' : (isCollapsed ? 'w-16' : 'w-64')
      ]"
    >
      <!-- Logo and Toggle -->
      <div class="flex items-center h-16 flex-shrink-0 px-4 border-b border-[var(--sidebar-border)] justify-between">
        <div class="flex items-center">
          <img src="/logo-placeholder.png" alt="LaunchCue" class="w-8 h-8 flex-shrink-0 object-contain" />
          <span v-if="!isCollapsed || isMobile" class="ml-3 font-heading text-lg font-bold text-[var(--sidebar-text-active)]">LaunchCue</span>
        </div>
        <button
          v-if="!isMobile"
          @click="toggleSidebar"
          class="p-1 text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="isCollapsed" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          v-else
          @click="closeMobile"
          class="p-1 text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-active)] focus:outline-none"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-3 overflow-y-auto">
        <template v-for="group in navGroups" :key="group.label">
          <!-- Group header (expanded sidebar) -->
          <div v-if="!isCollapsed || isMobile">
            <button
              class="w-full flex items-center justify-between px-2 py-1.5 mt-3 first:mt-0 cursor-pointer group"
              @click="toggleGroup(group.label)"
            >
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--sidebar-text)] opacity-60 group-hover:opacity-100">{{ group.label }}</span>
              <ChevronDownIcon
                :class="[
                  'h-3.5 w-3.5 text-[var(--sidebar-text)] opacity-40 transition-transform duration-200',
                  collapsedGroups[group.label] ? '-rotate-90' : ''
                ]"
              />
            </button>
            <Transition name="nav-group">
              <div v-show="!collapsedGroups[group.label]" class="space-y-0.5">
                <router-link
                  v-for="item in group.items"
                  :key="item.name"
                  :to="item.href"
                  :class="[
                    'group flex items-center px-2 py-2 text-sm font-medium transition-colors rounded-sm',
                    item.current
                      ? 'bg-white/10 text-[var(--sidebar-text-active)] border-l-[3px] border-[var(--accent-primary)]'
                      : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)] border-l-[3px] border-transparent'
                  ]"
                  :title="item.name"
                  @click="isMobile && closeMobile()"
                >
                  <component :is="item.icon" class="flex-shrink-0 h-5 w-5" aria-hidden="true" />
                  <span class="ml-3">{{ item.name }}</span>
                  <span
                    v-if="shortcutMap[item.name]"
                    class="ml-auto text-[10px] font-mono opacity-0 group-hover:opacity-40 transition-opacity"
                  >{{ shortcutMap[item.name] }}</span>
                </router-link>
              </div>
            </Transition>
          </div>

          <!-- Collapsed sidebar: dividers between groups, icon-only -->
          <div v-else>
            <div v-if="group.label !== 'CORE'" class="mx-2 my-2 border-t border-[var(--sidebar-border)]"></div>
            <router-link
              v-for="item in group.items"
              :key="item.name"
              :to="item.href"
              :class="[
                'group flex items-center justify-center py-2 transition-colors relative rounded-sm',
                item.current
                  ? 'bg-white/10 text-[var(--sidebar-text-active)] border-l-[3px] border-[var(--accent-primary)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)] border-l-[3px] border-transparent'
              ]"
              :title="item.name"
            >
              <component :is="item.icon" class="flex-shrink-0 h-5 w-5" aria-hidden="true" />
            </router-link>
          </div>
        </template>
      </nav>

      <!-- User Info / Logout -->
      <div class="mt-auto p-3 border-t border-[var(--sidebar-border)]">
        <div v-if="authStore.user" class="flex items-center mb-2" :class="{'justify-center': isCollapsed && !isMobile}">
          <div class="w-8 h-8 bg-[var(--accent-primary)] text-white flex items-center justify-center text-xs font-heading font-bold flex-shrink-0 rounded-sm">
            {{ userInitials }}
          </div>
          <div v-if="!isCollapsed || isMobile" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--sidebar-text-active)] truncate">{{ authStore.user.name }}</p>
            <p class="text-xs text-[var(--sidebar-text)] truncate">{{ authStore.user.email }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full flex items-center px-3 py-2 text-sm font-medium text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-active)] transition-colors rounded-sm"
          :class="{'justify-center': isCollapsed && !isMobile}"
          title="Logout"
        >
           <LogoutIcon class="h-5 w-5" aria-hidden="true" />
           <span v-if="!isCollapsed || isMobile" class="ml-2">LOGOUT</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useResponsive } from '@/composables/useResponsive'
import { getInitials } from '@/utils/formatters'
import {
    HomeIcon,
    UsersIcon,
    UserGroupIcon,
    BriefcaseIcon,
    CalendarIcon,
    SparklesIcon,
    DocumentTextIcon,
    ChatBubbleLeftEllipsisIcon as AnnotationIcon,
    CogIcon,
    ChartBarSquareIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    FolderOpenIcon,
    LightBulbIcon,
    ArrowLeftOnRectangleIcon as LogoutIcon,
    ChevronDownIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()
const { isMobile } = useResponsive()

const isCollapsed = ref(false)
const isOpen = ref(false)

// Persisted collapsed groups
const STORAGE_KEY = 'launchcue-sidebar-groups'
const collapsedGroups = reactive(loadGroupState())

function loadGroupState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function toggleGroup(label) {
  collapsedGroups[label] = !collapsedGroups[label]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedGroups))
}

const emit = defineEmits(['collapsed-changed'])

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
  emitState()
}

function openMobile() {
  isOpen.value = true
}

function closeMobile() {
  isOpen.value = false
}

function emitState() {
  emit('collapsed-changed', isCollapsed.value, isMobile.value)
}

watch(isMobile, (mobile) => {
  if (mobile) {
    isCollapsed.value = true
    isOpen.value = false
  }
  emitState()
}, { immediate: true })

const navGroups = computed(() => [
  {
    label: 'CORE',
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon, current: route.name === 'dashboard' },
      { name: 'Tasks', href: '/tasks', icon: ChartBarSquareIcon, current: route.name === 'tasks' },
      { name: 'Calendar', href: '/calendar', icon: CalendarIcon, current: route.name === 'calendar' },
    ]
  },
  {
    label: 'WORK',
    items: [
      { name: 'Clients', href: '/clients', icon: UsersIcon, current: route.name === 'clients' || route.name === 'client-detail' },
      { name: 'Projects', href: '/projects', icon: BriefcaseIcon, current: route.name === 'projects' || route.name === 'project-detail' },
      { name: 'Campaigns', href: '/campaigns', icon: SparklesIcon, current: route.name?.startsWith('campaign') },
      { name: 'Scopes', href: '/scopes', icon: ClipboardDocumentListIcon, current: route.name?.toString().startsWith('scope') },
      { name: 'Invoices', href: '/invoices', icon: CurrencyDollarIcon, current: route.name?.toString().startsWith('invoice') },
    ]
  },
  {
    label: 'KNOWLEDGE',
    items: [
      { name: 'Notes', href: '/notes', icon: DocumentTextIcon, current: route.name === 'notes' },
      { name: 'Brain Dump', href: '/brain-dump', icon: LightBulbIcon, current: route.name === 'braindump' },
      { name: 'Resources', href: '/resources', icon: FolderOpenIcon, current: route.name === 'resources' },
    ]
  },
  {
    label: 'ADMIN',
    items: [
      { name: 'Team', href: '/team', icon: UserGroupIcon, current: route.name === 'team' },
      { name: 'Settings', href: '/settings', icon: CogIcon, current: route.name === 'settings' },
    ]
  }
])

// Keyboard shortcut hints for nav items (from useKeyboardShortcuts g-chords)
const shortcutMap = {
  'Dashboard': 'G D',
  'Tasks': 'G T',
  'Projects': 'G P',
  'Clients': 'G C',
  'Notes': 'G N',
  'Brain Dump': 'G B',
  'Settings': 'G S',
}

const userInitials = computed(() => getInitials(authStore.user?.name))

const handleLogout = async () => {
    await authStore.logout()
}

defineExpose({
  isCollapsed,
  isMobile,
  toggleSidebar,
  openMobile,
  closeMobile,
  isOpen
})
</script>

<style scoped>
.sidebar-backdrop-enter-active,
.sidebar-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-backdrop-enter-from,
.sidebar-backdrop-leave-to {
  opacity: 0;
}
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.3s ease;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
}

/* Nav group collapse animation */
.nav-group-enter-active,
.nav-group-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.nav-group-enter-from,
.nav-group-leave-to {
  opacity: 0;
  max-height: 0;
}
.nav-group-enter-to,
.nav-group-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
