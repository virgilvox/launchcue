<template>
  <div>
    <!-- Back link -->
    <router-link to="/portal" class="inline-flex items-center text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
      </svg>
      Back to Portal
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading project..." />
    </div>

    <!-- Not Found -->
    <div v-else-if="!project" class="text-center py-10">
      <p class="text-[var(--text-secondary)]">Project not found.</p>
      <router-link to="/portal" class="btn btn-primary mt-4">Back to Portal</router-link>
    </div>

    <!-- Project Content -->
    <div v-else class="space-y-8">
      <!-- Project Header -->
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 class="heading-page">{{ project.title || project.name }}</h1>
            <p v-if="project.description" class="text-caption mt-2">{{ project.description }}</p>
          </div>
          <span :class="getStatusColor(project.status)" class="self-start text-xs px-3 py-1  font-medium">
            {{ project.status }}
          </span>
        </div>

        <!-- Project dates -->
        <div v-if="project.startDate || project.endDate" class="flex flex-wrap gap-4 mt-4 text-sm text-[var(--text-secondary)]">
          <span v-if="project.startDate">
            Start: {{ formatDate(project.startDate) }}
          </span>
          <span v-if="project.endDate">
            Due: {{ formatDate(project.endDate) }}
          </span>
        </div>
      </div>

      <!-- Scopes Section -->
      <div v-if="scopes.length > 0">
        <h2 class="heading-section mb-4">Scopes &amp; Deliverables</h2>
        <div class="space-y-4">
          <div
            v-for="scope in scopes"
            :key="scope.id"
            class="card p-6"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 class="heading-card">{{ scope.title }}</h3>
                <p v-if="scope.description" class="text-caption mt-1">{{ scope.description }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-[var(--text-primary)]">
                  {{ formatCurrency(scope.totalAmount) }}
                </span>
                <span :class="getStatusColor(scope.status)" class="text-xs px-2 py-0.5 ">
                  {{ scope.status }}
                </span>
              </div>
            </div>

            <!-- Deliverables Table -->
            <div v-if="scope.deliverables && scope.deliverables.length > 0" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[var(--border-light)]">
                    <th class="text-left py-2 pr-4 font-medium text-[var(--text-secondary)]">Deliverable</th>
                    <th class="text-left py-2 pr-4 font-medium text-[var(--text-secondary)]">Status</th>
                    <th class="text-right py-2 font-medium text-[var(--text-secondary)]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="deliverable in scope.deliverables"
                    :key="deliverable.id"
                    class="border-b border-[var(--border-light)]"
                  >
                    <td class="py-2 pr-4 text-[var(--text-primary)]">
                      {{ deliverable.title }}
                      <p v-if="deliverable.description" class="text-xs text-[var(--text-secondary)] mt-0.5">{{ deliverable.description }}</p>
                    </td>
                    <td class="py-2 pr-4">
                      <span :class="getStatusColor(deliverable.status)" class="text-xs px-2 py-0.5 ">
                        {{ deliverable.status }}
                      </span>
                    </td>
                    <td class="py-2 text-right text-[var(--text-primary)]">
                      {{ formatCurrency(deliverable.amount || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Scope approval actions (for sent scopes) -->
            <div v-if="scope.status === 'sent'" class="mt-4 pt-4 border-t border-[var(--border-light)] flex justify-end gap-3">
              <button
                @click="requestScopeChanges(scope)"
                class="btn btn-secondary btn-sm"
                :disabled="scopeActionLoading"
              >
                Request Changes
              </button>
              <button
                @click="approveScope(scope)"
                class="btn btn-primary btn-sm"
                :disabled="scopeActionLoading"
              >
                {{ scopeActionLoading ? 'Processing...' : 'Approve Scope' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Comments Section -->
      <div class="card p-6">
        <CommentThread resourceType="project" :resourceId="projectId" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import apiService, { PROJECT_ENDPOINT, SCOPE_ENDPOINT } from '@/services/api.service'
import scopeService from '@/services/scope.service'
import { getStatusColor } from '@/utils/statusColors'
import { formatCurrency } from '@/utils/formatters'
import { formatDate } from '@/utils/dateFormatter'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import CommentThread from '@/components/ui/CommentThread.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

const projectId = route.params.id
const loading = ref(true)
const project = ref(null)
const scopes = ref([])
const scopeActionLoading = ref(false)

async function loadProject() {
  loading.value = true
  try {
    const [projectData, scopesData] = await Promise.allSettled([
      apiService.get(`${PROJECT_ENDPOINT}/${projectId}`),
      scopeService.getScopes({ projectId }),
    ])

    project.value = projectData.status === 'fulfilled' ? projectData.value : null
    scopes.value = scopesData.status === 'fulfilled' && Array.isArray(scopesData.value)
      ? scopesData.value
      : []
  } catch (err) {
    toast.error('Failed to load project details')
  } finally {
    loading.value = false
  }
}

async function approveScope(scope) {
  scopeActionLoading.value = true
  try {
    await scopeService.updateScope(scope.id, { status: 'approved' })
    const idx = scopes.value.findIndex(s => s.id === scope.id)
    if (idx !== -1) {
      scopes.value[idx] = { ...scopes.value[idx], status: 'approved', approvedAt: new Date().toISOString() }
    }
    toast.success('Scope approved successfully')
  } catch (err) {
    toast.error('Failed to approve scope')
  } finally {
    scopeActionLoading.value = false
  }
}

async function requestScopeChanges(scope) {
  scopeActionLoading.value = true
  try {
    await scopeService.updateScope(scope.id, { status: 'revised' })
    const idx = scopes.value.findIndex(s => s.id === scope.id)
    if (idx !== -1) {
      scopes.value[idx] = { ...scopes.value[idx], status: 'revised' }
    }
    toast.success('Change request submitted')
  } catch (err) {
    toast.error('Failed to submit change request')
  } finally {
    scopeActionLoading.value = false
  }
}

onMounted(() => {
  loadProject()
})
</script>
