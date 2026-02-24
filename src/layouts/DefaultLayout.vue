<template>
  <div class="flex h-screen overflow-hidden" style="background-color: var(--bg);">
    <!-- Global Search (Cmd+K / Ctrl+K) -->
    <GlobalSearch ref="globalSearch" />

    <!-- Sidebar -->
    <Sidebar ref="sidebar" @collapsed-changed="updateSidebarState" />

    <div class="flex-1 flex flex-col overflow-hidden transition-all duration-300">
      <header class="border-b-2 border-[var(--border)]" style="background-color: var(--surface);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="relative flex justify-between items-center h-16">
            <!-- Left side: hamburger + search -->
            <div class="flex items-center gap-3">
              <!-- Mobile hamburger -->
              <button
                v-if="isMobile"
                @click="sidebar?.openMobile()"
                class="btn-icon"
                aria-label="Open menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              <!-- Search trigger -->
              <button
                @click="$refs.globalSearch?.open()"
                class="flex items-center gap-2 px-4 py-2 text-body-sm border-2 border-[var(--border)] hover:shadow-brutal-sm transition-shadow min-w-[200px]"
                style="background-color: var(--bg); color: var(--text-secondary);"
              >
                <MagnifyingGlassIcon class="h-4 w-4 shrink-0" />
                <span class="hidden sm:inline">Search...</span>
                <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 mono text-[10px] font-bold border-2 border-[var(--border-light)] ml-auto">
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
                    class="input text-body-sm py-1.5 px-3 appearance-none pr-8"
                    :disabled="isSwitchingTeam"
                  >
                    <option v-if="isSwitchingTeam" value="">Switching...</option>
                    <option
                        v-for="team in authStore.userTeams"
                        :key="team.id"
                        :value="team.id"
                    >
                       {{ team.name }}
                    </option>
                  </select>
                   <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2" style="color: var(--text-secondary);">
                     <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                   </div>
              </div>
              <div v-else-if="authStore.currentTeam" class="hidden sm:block overline">
                  {{ authStore.currentTeam.name }}
              </div>

              <!-- Notifications -->
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 overflow-x-hidden overflow-y-auto" style="background-color: var(--bg);">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <router-view />
        </div>
      </main>
    </div>

    <!-- Keyboard Shortcut Help Overlay -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="showHelp"
          class="fixed inset-0 z-50 flex items-center justify-center"
          style="background-color: rgba(0, 0, 0, 0.6);"
          @click="showHelp = false"
          @keydown.escape="showHelp = false"
        >
          <div
            class="w-full max-w-lg border-2 shadow-brutal-lg p-6"
            style="background-color: var(--surface-elevated); border-color: var(--border); color: var(--text-primary);"
            @click.stop
          >
            <div class="flex justify-between items-center mb-4 pb-4 border-b-2" style="border-color: var(--border);">
              <h3 class="heading-section">Keyboard Shortcuts</h3>
              <button @click="showHelp = false" class="btn-icon">
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
            <div class="space-y-4">
              <div v-for="category in shortcutCategories" :key="category">
                <span class="overline">{{ category }}</span>
                <div class="mt-2 space-y-1">
                  <div
                    v-for="s in shortcutsByCategory(category)"
                    :key="s.keys"
                    class="flex justify-between items-center py-1"
                  >
                    <span class="text-body-sm">{{ s.description }}</span>
                    <kbd class="mono text-body-sm font-bold px-2 py-0.5 border-2" style="border-color: var(--border-light);">{{ s.keys }}</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Sidebar from '../components/Sidebar.vue'
import GlobalSearch from '../components/GlobalSearch.vue'
import NotificationBell from '../components/ui/NotificationBell.vue'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'

const authStore = useAuthStore()
const toast = useToast();
const isSwitchingTeam = ref(false);
const sidebar = ref(null);
const globalSearch = ref(null);
const isSidebarCollapsed = ref(false);
const isMobile = ref(false);
const isMac = computed(() => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform));

const { showHelp, shortcuts } = useKeyboardShortcuts()

const shortcutCategories = computed(() => [...new Set(shortcuts.map(s => s.category))])
const shortcutsByCategory = (category) => shortcuts.filter(s => s.category === category)

const updateSidebarState = (isCollapsed, isMobileView) => {
  isSidebarCollapsed.value = isCollapsed;
  isMobile.value = isMobileView;
}

onMounted(() => {
  setTimeout(() => {
    if (sidebar.value) {
      isSidebarCollapsed.value = sidebar.value.isCollapsed;
      isMobile.value = sidebar.value.isMobile;
    }
  }, 0);
});

const handleTeamSwitch = async (teamId) => {
    if (!teamId || teamId === authStore.currentTeam?.id) return;
    isSwitchingTeam.value = true;
    try {
        await authStore.switchTeam(teamId);
        toast.success(`Switched to team successfully!`);
    } catch (error) {
        toast.error(`Failed to switch team: ${error.message || 'Unknown error'}`);
    } finally {
        isSwitchingTeam.value = false;
    }
}
</script>

<style scoped>
select.input {
    min-width: 150px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
