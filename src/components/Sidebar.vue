<template>
  <div 
    :class="[
      'flex flex-col h-full bg-gray-800 text-gray-100 transition-all duration-300 ease-in-out',
      isCollapsed ? 'w-16' : 'w-64',
      'shrink-0' // Prevent shrinking to ensure proper width
    ]"
  >
    <!-- Logo and Toggle -->
    <div class="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-700 justify-between">
      <div class="flex items-center">
        <img class="h-8 w-auto" src="/logo-placeholder.png" alt="LaunchCue Logo">
        <span v-if="!isCollapsed" class="ml-3 text-xl font-semibold">LaunchCue</span>
      </div>
      <button 
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
          isCollapsed ? 'justify-center' : ''
        ]"
        :title="item.name"
      >
        <component :is="item.icon" class="flex-shrink-0 h-6 w-6" aria-hidden="true" />
        <span v-if="!isCollapsed" class="ml-3">{{ item.name }}</span>
      </router-link>
    </nav>

    <!-- User Info / Logout -->
    <div class="mt-auto p-4 border-t border-gray-700">
      <div v-if="authStore.user" class="flex items-center mb-3" :class="{'justify-center': isCollapsed}">
        <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
          {{ userInitials }}
        </div>
        <div v-if="!isCollapsed" class="ml-3 flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-100 truncate">{{ authStore.user.name }}</p>
          <p class="text-xs text-gray-400 truncate">{{ authStore.user.email }}</p>
        </div>
      </div>
      <button 
        @click="handleLogout"
        class="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        :class="{'justify-center': isCollapsed}"
        title="Logout"
      >
         <LogoutIcon class="h-5 w-5" aria-hidden="true" />
         <span v-if="!isCollapsed" class="ml-2">Logout</span>
      </button>
    </div>
  </div>
  
  <!-- Mobile overlay for sidebar when open -->
  <div 
    v-if="!isCollapsed && isMobile" 
    class="fixed inset-0 bg-gray-900 bg-opacity-50 z-10"
    @click="toggleSidebar"
  ></div>
  
  <!-- Mobile toggle button - shown only on mobile when sidebar is collapsed -->
  <button 
    v-if="isCollapsed && isMobile" 
    @click="toggleSidebar"
    class="fixed bottom-4 right-4 z-30 p-3 rounded-full bg-primary-500 text-white shadow-lg"
    aria-label="Open menu"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth' // Corrected path
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
    ArrowLeftOnRectangleIcon as LogoutIcon // Correct Heroicon name
} from '@heroicons/vue/24/outline'

const route = useRoute()
const authStore = useAuthStore()
const isCollapsed = ref(false)
const isMobile = ref(false)

// Check if the window width is mobile size
const checkIsMobile = () => {
  isMobile.value = window.innerWidth < 768 // md breakpoint
  // Auto-collapse sidebar on mobile
  if (isMobile.value && !isCollapsed.value) {
    isCollapsed.value = true
  }

  // Emit changes to parent component
  emitState()
}

// Toggle sidebar collapsed state
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  emitState()
}

// Emits for parent component communication
const emit = defineEmits(['collapsed-changed'])

// Emit current state to parent
const emitState = () => {
  emit('collapsed-changed', isCollapsed.value, isMobile.value)
}

// Watch for changes in state and emit them
watch([isCollapsed, isMobile], () => {
  emitState()
})

// Add window resize event listener
onMounted(() => {
  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)
})

// Clean up event listener
onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile)
})

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
  { name: 'Resources', href: '/resources', icon: DocumentTextIcon, current: route.name === 'resources' },
  { name: 'Settings', href: '/settings', icon: CogIcon, current: route.name === 'settings' },
])

const userInitials = computed(() => {
  if (!authStore.user?.name) return '?';
  const parts = authStore.user.name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
});

const handleLogout = async () => {
    await authStore.logout();
    // Navigation to /login is handled within the logout action
}

// Add at the end of the script section
defineExpose({
  isCollapsed,
  isMobile,
  toggleSidebar
})
</script>

<style scoped>
/* No need for additional sidebar styles */
</style>