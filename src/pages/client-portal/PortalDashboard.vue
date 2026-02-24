<template>
  <div>
    <h1 class="heading-page mb-6">Welcome{{ userName ? `, ${userName}` : '' }}</h1>

    <div v-if="loading" class="text-center py-10">
      <p class="text-[var(--text-secondary)]">Loading your dashboard...</p>
    </div>

    <div v-else class="space-y-8">
      <!-- Onboarding Section (if any active) -->
      <div v-if="activeChecklists.length > 0">
        <h2 class="heading-section mb-4">Onboarding</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <router-link
            v-for="checklist in activeChecklists"
            :key="checklist.id"
            :to="`/portal/onboarding/${checklist.id}`"
            class="card card-interactive p-5"
          >
            <h3 class="heading-card">{{ checklist.title }}</h3>
            <p class="text-caption mt-1">{{ completedStepCount(checklist) }} of {{ checklist.steps.length }} steps completed</p>
            <!-- Progress bar -->
            <div class="mt-3 w-full bg-[var(--surface)] border border-[var(--border-light)] h-2">
              <div class="bg-[var(--accent-primary)] h-2 transition-all" :style="{ width: progressPercent(checklist) + '%' }"></div>
            </div>
          </router-link>
        </div>
      </div>

      <!-- Projects Section -->
      <div>
        <h2 class="heading-section mb-4">Your Projects</h2>
        <div v-if="projects.length === 0" class="card p-6 text-center">
          <p class="text-[var(--text-secondary)]">No projects assigned yet.</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <router-link
            v-for="project in projects"
            :key="project.id"
            :to="`/portal/projects/${project.id}`"
            class="card card-interactive p-5"
          >
            <h3 class="heading-card">{{ project.title }}</h3>
            <p class="text-caption mt-1 line-clamp-2">{{ project.description }}</p>
            <span :class="getStatusColor(project.status)" class="mt-3 inline-block text-xs px-2 py-0.5 ">
              {{ project.status }}
            </span>
          </router-link>
        </div>
      </div>

      <!-- Pending Approvals (scopes awaiting client approval) -->
      <div v-if="pendingScopes.length > 0">
        <h2 class="heading-section mb-4">Pending Approvals</h2>
        <div class="space-y-3">
          <div v-for="scope in pendingScopes" :key="scope.id" class="card p-5 flex justify-between items-center">
            <div>
              <h3 class="heading-card">{{ scope.title }}</h3>
              <p class="text-caption">{{ scope.deliverables?.length || 0 }} deliverables &bull; {{ formatCurrency(scope.totalAmount) }}</p>
            </div>
            <router-link :to="`/portal/projects/${scope.projectId}`" class="btn btn-sm btn-primary">Review</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import onboardingService from '@/services/onboarding.service'
import apiService, { SCOPE_ENDPOINT, PROJECT_ENDPOINT } from '@/services/api.service'
import { getStatusColor } from '@/utils/statusColors'
import { formatCurrency } from '@/utils/formatters'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const projects = ref([])
const checklists = ref([])
const scopes = ref([])

const userName = computed(() => authStore.user?.name || '')

const activeChecklists = computed(() => {
  return checklists.value.filter(c => c.status !== 'completed')
})

const pendingScopes = computed(() => {
  return scopes.value.filter(s => s.status === 'sent')
})

function completedStepCount(checklist) {
  if (!checklist.steps || checklist.steps.length === 0) return 0
  return checklist.steps.filter(s => s.completedAt).length
}

function progressPercent(checklist) {
  if (!checklist.steps || checklist.steps.length === 0) return 0
  return Math.round((completedStepCount(checklist) / checklist.steps.length) * 100)
}

async function loadDashboard() {
  loading.value = true
  try {
    const clientId = authStore.user?.clientId

    const [projectsData, checklistsData, scopesData] = await Promise.allSettled([
      apiService.get(PROJECT_ENDPOINT, clientId ? { clientId } : {}),
      onboardingService.getChecklists(clientId ? { clientId } : {}),
      apiService.get(SCOPE_ENDPOINT, { status: 'sent' }),
    ])

    projects.value = projectsData.status === 'fulfilled' && Array.isArray(projectsData.value)
      ? projectsData.value
      : []

    checklists.value = checklistsData.status === 'fulfilled' && Array.isArray(checklistsData.value)
      ? checklistsData.value
      : []

    scopes.value = scopesData.status === 'fulfilled' && Array.isArray(scopesData.value)
      ? scopesData.value
      : []
  } catch (err) {
    console.error('Error loading portal dashboard:', err)
    toast.error('Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>
