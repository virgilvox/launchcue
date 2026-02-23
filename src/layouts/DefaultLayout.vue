<template>
  <div class="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
    <!-- Global Search (Cmd+K / Ctrl+K) -->
    <GlobalSearch ref="globalSearch" />

    <!-- Sidebar will be rendered by the Sidebar component -->
    <Sidebar ref="sidebar" @collapsed-changed="updateSidebarState" />
    
    <div class="flex-1 flex flex-col overflow-hidden transition-all duration-300">
      <header class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="relative flex justify-between items-center h-16">
            <!-- Left side - Search trigger -->
            <div>
              <button
                @click="$refs.globalSearch?.open()"
                class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <MagnifyingGlassIcon class="h-4 w-4" />
                <span class="hidden sm:inline">Search...</span>
                <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 ml-2">
                  {{ isMac ? '⌘' : 'Ctrl' }}+K
                </kbd>
              </button>
            </div>
            
            <!-- Right side: Team Switcher & User Menu -->
            <div class="flex items-center space-x-4">
              <!-- Team Switcher Dropdown -->
              <div v-if="authStore.userTeams.length > 1" class="relative">
                  <label for="team-switcher" class="sr-only">Current Team</label>
                  <select 
                    id="team-switcher"
                    :value="authStore.currentTeam?.id"
                    @change="handleTeamSwitch($event.target.value)"
                    class="input text-sm py-1.5 px-3 appearance-none pr-8" 
                    :disabled="isSwitchingTeam"
                  >
                    <option v-if="isSwitchingTeam" value="">Switching...</option>
                    <option 
                        v-for="team in authStore.userTeams" 
                        :key="team.id" 
                        :value="team.id"
                    >
                       Team: {{ team.name }}
                    </option>
                  </select>
                   <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-400">
                     <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                   </div>
              </div>
              <div v-else-if="authStore.currentTeam" class="text-sm text-gray-500 dark:text-gray-400">
                  Team: {{ authStore.currentTeam.name }}
              </div>

              <!-- Notifications -->
              <NotificationBell />

              <!-- User menu placeholder -->
              <div>
                <!-- Add user dropdown/profile link here later -->
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Sidebar from '../components/Sidebar.vue'
import GlobalSearch from '../components/GlobalSearch.vue'
import NotificationBell from '../components/ui/NotificationBell.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification';
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const toast = useToast();
const isSwitchingTeam = ref(false);
const sidebar = ref(null);
const globalSearch = ref(null);
const isSidebarCollapsed = ref(false);
const isMobile = ref(false);
const isMac = computed(() => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform));

// Update sidebar state when the Sidebar component emits changes
const updateSidebarState = (isCollapsed, isMobileView) => {
  isSidebarCollapsed.value = isCollapsed;
  isMobile.value = isMobileView;
}

// On mount, check if sidebar is collapsed initially
onMounted(() => {
  // Small delay to ensure the sidebar component is mounted
  setTimeout(() => {
    if (sidebar.value) {
      isSidebarCollapsed.value = sidebar.value.isCollapsed;
      isMobile.value = sidebar.value.isMobile;
    }
  }, 0);
});

const handleTeamSwitch = async (teamId) => {
    if (!teamId || teamId === authStore.currentTeam?.id) {
        return; // Do nothing if same team selected or value is empty
    }
    isSwitchingTeam.value = true;
    try {
        await authStore.switchTeam(teamId);
        toast.success(`Switched to team successfully!`);
        // Data reloading is handled within the switchTeam action
    } catch (error) {
        toast.error(`Failed to switch team: ${error.message || 'Unknown error'}`);
    } finally {
        isSwitchingTeam.value = false;
    }
}
</script>

<style scoped>
/* Add specific layout styles if needed */
select.input {
    min-width: 150px; /* Give dropdown some base width */
}
</style> 