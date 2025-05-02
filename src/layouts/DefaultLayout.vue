<template>
  <div class="flex h-screen bg-gray-100 dark:bg-gray-900">
    <Sidebar />
    
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="bg-white dark:bg-gray-800 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="relative flex justify-between items-center h-16">
            <!-- Left side placeholder (e.g., Breadcrumbs, Search) -->
            <div>
              <!-- Add Search or Breadcrumbs here later -->
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
import { ref } from 'vue';
import Sidebar from '../components/Sidebar.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification';

const authStore = useAuthStore()
const toast = useToast();
const isSwitchingTeam = ref(false);

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