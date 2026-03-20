<template>
  <div>
    <h1 class="heading-page mb-6">Welcome{{ userName ? `, ${userName}` : '' }}</h1>

    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading your dashboard..." />
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
          <div v-for="scope in pendingScopes" :key="scope.id" class="card p-5">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="heading-card">{{ scope.title }}</h3>
                <p class="text-caption">{{ scope.deliverables?.length || 0 }} deliverables &bull; {{ formatCurrency(scope.totalAmount) }}</p>
              </div>
              <router-link :to="`/portal/projects/${scope.projectId}`" class="btn btn-sm btn-ghost">Review Details</router-link>
            </div>

            <!-- Revision reason input (shown when requesting revision) -->
            <div v-if="revisionScopeId === scope.id" class="mt-4 space-y-3">
              <label class="block text-sm font-medium text-[var(--text-primary)]">
                Reason for revision
              </label>
              <textarea
                v-model="revisionReason"
                rows="3"
                class="input w-full"
                placeholder="Describe what changes you'd like..."
              ></textarea>
              <div class="flex gap-2">
                <button
                  class="btn btn-sm btn-accent"
                  :disabled="!revisionReason.trim() || scopeActionLoading"
                  @click="submitRevision(scope.id)"
                >
                  {{ scopeActionLoading ? 'Submitting...' : 'Submit Revision Request' }}
                </button>
                <button
                  class="btn btn-sm btn-ghost"
                  :disabled="scopeActionLoading"
                  @click="cancelRevision()"
                >
                  Cancel
                </button>
              </div>
            </div>

            <!-- Action buttons -->
            <div v-else class="mt-4 flex gap-2">
              <button
                class="btn btn-sm btn-primary"
                :disabled="scopeActionLoading"
                @click="handleApproveScope(scope.id)"
              >
                Approve
              </button>
              <button
                class="btn btn-sm btn-outline"
                :disabled="scopeActionLoading"
                @click="handleRequestRevision(scope.id)"
              >
                Request Revision
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Approve Dialog -->
      <div v-if="approveDialog.isOpen.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="card p-6 max-w-md w-full mx-4 shadow-brutal">
          <h3 class="heading-card mb-2">Approve Scope</h3>
          <p class="text-[var(--text-secondary)] mb-6">
            Are you sure you want to approve this scope? This action cannot be undone.
          </p>
          <div class="flex gap-2 justify-end">
            <button class="btn btn-sm btn-ghost" :disabled="approveDialog.isProcessing.value" @click="approveDialog.cancel()">Cancel</button>
            <button class="btn btn-sm btn-primary" :disabled="approveDialog.isProcessing.value" @click="approveDialog.confirm()">
              {{ approveDialog.isProcessing.value ? 'Approving...' : 'Confirm Approve' }}
            </button>
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
import { useScopeStore } from '@/stores/scope'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getContainer } from '@/core/service-container'
import { PROJECT_REPO, SCOPE_REPO, ONBOARDING_REPO } from '@/adapters/repository-keys'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { getStatusColor } from '@/utils/statusColors'
import { formatCurrency } from '@/utils/formatters'

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const scopeStore = useScopeStore()
const approveDialog = useConfirmDialog()

const loading = ref(true)
const projects = ref([])
const checklists = ref([])
const scopes = ref([])
const scopeActionLoading = ref(false)
const revisionScopeId = ref(null)
const revisionReason = ref('')

const userName = computed(() => authStore.user?.name || '')

const activeChecklists = computed(() => {
  return checklists.value.filter(c => c.status !== 'completed')
})

const pendingScopes = computed(() => {
  return scopes.value.filter(s => s.status === 'sent')
})

async function handleApproveScope(scopeId) {
  const confirmed = await approveDialog.requestConfirm(scopeId)
  if (!confirmed) return

  scopeActionLoading.value = true
  try {
    await scopeStore.updateScope(scopeId, { status: 'approved' })
    // Update local scopes list so it disappears from pending
    const idx = scopes.value.findIndex(s => s.id === scopeId)
    if (idx !== -1) {
      scopes.value[idx] = { ...scopes.value[idx], status: 'approved' }
    }
    toast.success('Scope approved successfully')
  } catch (err) {
    toast.error(err.message || 'Failed to approve scope')
  } finally {
    scopeActionLoading.value = false
    approveDialog.done()
  }
}

function handleRequestRevision(scopeId) {
  revisionScopeId.value = scopeId
  revisionReason.value = ''
}

function cancelRevision() {
  revisionScopeId.value = null
  revisionReason.value = ''
}

async function submitRevision(scopeId) {
  if (!revisionReason.value.trim()) return

  scopeActionLoading.value = true
  try {
    await scopeStore.updateScope(scopeId, {
      status: 'revised',
      revisionNotes: revisionReason.value.trim(),
    })
    const idx = scopes.value.findIndex(s => s.id === scopeId)
    if (idx !== -1) {
      scopes.value[idx] = { ...scopes.value[idx], status: 'revised' }
    }
    toast.success('Revision request submitted')
    cancelRevision()
  } catch (err) {
    toast.error(err.message || 'Failed to request revision')
  } finally {
    scopeActionLoading.value = false
  }
}

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
    const container = getContainer()
    const projectRepo = container.resolve(PROJECT_REPO)
    const scopeRepo = container.resolve(SCOPE_REPO)
    const onboardingRepo = container.resolve(ONBOARDING_REPO)
    const clientId = authStore.user?.clientId

    const [projectsData, checklistsData, scopesData] = await Promise.allSettled([
      projectRepo.findAll(clientId ? { clientId } : {}),
      onboardingRepo.findAll(clientId ? { clientId } : {}),
      scopeRepo.findAll(clientId ? { status: 'sent', clientId } : { status: 'sent' }),
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
    toast.error('Failed to load dashboard data')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>
