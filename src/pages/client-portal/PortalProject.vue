<template>
  <div>
    <!-- Back link -->
    <router-link to="/portal" class="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
      </svg>
      Back to Portal
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading project...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!project" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Project not found.</p>
      <router-link to="/portal" class="btn btn-primary mt-4">Back to Portal</router-link>
    </div>

    <!-- Project Content -->
    <div v-else class="space-y-8">
      <!-- Project Header -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 class="heading-page">{{ project.title || project.name }}</h1>
            <p v-if="project.description" class="text-caption mt-2">{{ project.description }}</p>
          </div>
          <span :class="getStatusColor(project.status)" class="self-start text-xs px-3 py-1 rounded-full font-medium">
            {{ project.status }}
          </span>
        </div>

        <!-- Project dates -->
        <div v-if="project.startDate || project.endDate" class="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
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
            class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 class="heading-card">{{ scope.title }}</h3>
                <p v-if="scope.description" class="text-caption mt-1">{{ scope.description }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {{ formatCurrency(scope.totalAmount) }}
                </span>
                <span :class="getStatusColor(scope.status)" class="text-xs px-2 py-0.5 rounded-full">
                  {{ scope.status }}
                </span>
              </div>
            </div>

            <!-- Deliverables Table -->
            <div v-if="scope.deliverables && scope.deliverables.length > 0" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200 dark:border-gray-700">
                    <th class="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Deliverable</th>
                    <th class="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th class="text-right py-2 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="deliverable in scope.deliverables"
                    :key="deliverable.id"
                    class="border-b border-gray-100 dark:border-gray-700/50"
                  >
                    <td class="py-2 pr-4 text-gray-800 dark:text-gray-200">
                      {{ deliverable.title }}
                      <p v-if="deliverable.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ deliverable.description }}</p>
                    </td>
                    <td class="py-2 pr-4">
                      <span :class="getStatusColor(deliverable.status)" class="text-xs px-2 py-0.5 rounded-full">
                        {{ deliverable.status }}
                      </span>
                    </td>
                    <td class="py-2 text-right text-gray-700 dark:text-gray-300">
                      {{ formatCurrency(deliverable.amount || 0) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Scope approval actions (for sent scopes) -->
            <div v-if="scope.status === 'sent'" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
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
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
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
    console.error('Error loading project:', err)
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
    console.error('Error approving scope:', err)
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
    console.error('Error requesting scope changes:', err)
    toast.error('Failed to submit change request')
  } finally {
    scopeActionLoading.value = false
  }
}

onMounted(() => {
  loadProject()
})
</script>
