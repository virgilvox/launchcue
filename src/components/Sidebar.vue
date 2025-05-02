<template>
  <div class="flex flex-col h-full bg-gray-800 text-gray-100 w-64">
    <!-- Logo -->
    <div class="flex items-center justify-center h-16 flex-shrink-0 px-4 border-b border-gray-700">
        <img class="h-8 w-auto" src="/logo-placeholder.png" alt="LaunchCue Logo">
        <span class="ml-3 text-xl font-semibold">LaunchCue</span>
    </div>
    
    <!-- Navigation -->
    <nav class="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <router-link 
            v-for="item in navigation" 
            :key="item.name" 
            :to="item.href" 
            :class="[
                item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
            ]"
        >
            <component :is="item.icon" class="mr-3 flex-shrink-0 h-6 w-6" aria-hidden="true" />
            {{ item.name }}
        </router-link>
    </nav>

    <!-- User Info / Logout -->
    <div class="mt-auto p-4 border-t border-gray-700">
        <div v-if="authStore.user" class="flex items-center mb-3">
            <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-semibold mr-3 flex-shrink-0">
                {{ userInitials }}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-100 truncate">{{ authStore.user.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ authStore.user.email }}</p>
            </div>
        </div>
        <button 
            @click="handleLogout"
            class="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            title="Logout"
        >
             <LogoutIcon class="h-5 w-5 mr-2" aria-hidden="true" />
             <span>Logout</span>
        </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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
  // { name: 'Resources', href: '/resources', icon: DocumentTextIcon, current: route.name === 'resources' },
  // { name: 'Settings', href: '/settings', icon: CogIcon, current: route.name === 'settings' },
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
</script>

<style scoped>
/* Add sidebar specific styles if needed */
</style>