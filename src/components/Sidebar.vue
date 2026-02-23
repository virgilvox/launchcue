<template>
  <!-- Mobile backdrop -->
  <Transition name="sidebar-backdrop">
    <div
      v-if="isMobile && isOpen"
      class="fixed inset-0 bg-gray-900/50 z-30"
      @click="closeMobile"
    ></div>
  </Transition>

  <!-- Sidebar -->
  <Transition :name="isMobile ? 'sidebar-slide' : undefined">
    <div
      v-show="!isMobile || isOpen"
      :class="[
        'flex flex-col h-full bg-gray-800 text-gray-100 transition-all duration-300 ease-in-out shrink-0',
        isMobile ? 'fixed inset-y-0 left-0 z-40 w-64 shadow-xl' : (isCollapsed ? 'w-16' : 'w-64')
      ]"
    >
      <!-- Logo and Toggle -->
      <div class="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-700 justify-between">
        <div class="flex items-center">
          <img class="h-8 w-auto" src="/logo-placeholder.png" alt="LaunchCue Logo">
          <span v-if="!isCollapsed || isMobile" class="ml-3 text-xl font-semibold">LaunchCue</span>
        </div>
        <button
          v-if="!isMobile"
          @click="toggleSidebar"
          class="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              v-if="isCollapsed"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
        <button
          v-else
          @click="closeMobile"
          class="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          :class="[
            item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
            'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
            isCollapsed && !isMobile ? 'justify-center' : ''
          ]"
          :title="item.name"
          @click="isMobile && closeMobile()"
        >
          <component :is="item.icon" class="flex-shrink-0 h-6 w-6" aria-hidden="true" />
          <span v-if="!isCollapsed || isMobile" class="ml-3">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- User Info / Logout -->
      <div class="mt-auto p-4 border-t border-gray-700">
        <div v-if="authStore.user" class="flex items-center mb-3" :class="{'justify-center': isCollapsed && !isMobile}">
          <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {{ userInitials }}
          </div>
          <div v-if="!isCollapsed || isMobile" class="ml-3 flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-100 truncate">{{ authStore.user.name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ authStore.user.email }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          :class="{'justify-center': isCollapsed && !isMobile}"
          title="Logout"
        >
           <LogoutIcon class="h-5 w-5" aria-hidden="true" />
           <span v-if="!isCollapsed || isMobile" class="ml-2">Logout</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useResponsive } from '@/composables/useResponsive'
import { getInitials } from '@/utils/formatters'
import {
    HomeIcon,
    UsersIcon,
    BriefcaseIcon,
    CalendarIcon,
    SparklesIcon,
    DocumentTextIcon,
    ChatBubbleLeftEllipsisIcon as AnnotationIcon,
    CogIcon,
    ChartBarSquareIcon,
    ClipboardDocumentListIcon,
    CurrencyDollarIcon,
    ArrowLeftOnRectangleIcon as LogoutIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()
const { isMobile } = useResponsive()

const isCollapsed = ref(false)
const isOpen = ref(false) // mobile drawer state

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

// When transitioning between mobile/desktop, sync states
watch(isMobile, (mobile) => {
  if (mobile) {
    isCollapsed.value = true
    isOpen.value = false
  }
  emitState()
}, { immediate: true })

const navigation = computed(() => [
  { name: 'Dashboard', href: '/', icon: HomeIcon, current: route.name === 'dashboard' },
  { name: 'Clients', href: '/clients', icon: UsersIcon, current: route.name === 'clients' || route.name === 'client-detail' },
  { name: 'Projects', href: '/projects', icon: BriefcaseIcon, current: route.name === 'projects' || route.name === 'project-detail' },
  { name: 'Tasks', href: '/tasks', icon: ChartBarSquareIcon, current: route.name === 'tasks' },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon, current: route.name === 'calendar' },
  { name: 'Campaigns', href: '/campaigns', icon: SparklesIcon, current: route.name?.startsWith('campaign') },
  { name: 'Brain Dump', href: '/brain-dump', icon: AnnotationIcon, current: route.name === 'braindump' },
  { name: 'Team', href: '/team', icon: UsersIcon, current: route.name === 'team' },
  { name: 'Notes', href: '/notes', icon: DocumentTextIcon, current: route.name === 'notes' },
  { name: 'Scopes', href: '/scopes', icon: ClipboardDocumentListIcon, current: route.name?.toString().startsWith('scope') },
  { name: 'Invoices', href: '/invoices', icon: CurrencyDollarIcon, current: route.name?.toString().startsWith('invoice') },
  { name: 'Resources', href: '/resources', icon: DocumentTextIcon, current: route.name === 'resources' },
  { name: 'Settings', href: '/settings', icon: CogIcon, current: route.name === 'settings' },
])

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
</style>
