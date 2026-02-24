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
      <p class="text-gray-500 dark:text-gray-400">Loading onboarding...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!checklist" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Onboarding checklist not found.</p>
      <router-link to="/portal" class="btn btn-primary mt-4">Back to Portal</router-link>
    </div>

    <!-- Onboarding Content -->
    <div v-else class="space-y-6">
      <!-- Title & Overall Progress -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 class="heading-page">{{ checklist.title }}</h1>
        <div class="mt-3 flex items-center gap-4">
          <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              class="bg-[var(--accent-primary)] h-2.5 rounded-full transition-all duration-300"
              :style="{ width: overallProgress + '%' }"
            ></div>
          </div>
          <span class="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {{ completedCount }} / {{ checklist.steps.length }} steps
          </span>
        </div>
      </div>

      <!-- Step Layout -->
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Step Progress Sidebar -->
        <div class="lg:w-80 flex-shrink-0">
          <OnboardingProgress
            :steps="checklist.steps"
            :currentIndex="currentStepIndex"
            @select="goToStep"
          />
        </div>

        <!-- Current Step Content -->
        <div class="flex-1 min-w-0">
          <div v-if="currentStep" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <!-- Step Header -->
            <div class="mb-6">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide">
                  Step {{ currentStepIndex + 1 }} of {{ checklist.steps.length }}
                </span>
                <span
                  v-if="currentStep.completedAt"
                  class="inline-flex items-center text-xs text-green-600 dark:text-green-400 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                  Completed
                </span>
              </div>
              <h2 class="heading-section">{{ currentStep.title }}</h2>
              <p v-if="currentStep.description && currentStep.type !== 'info'" class="text-caption mt-2">
                {{ currentStep.description }}
              </p>
            </div>

            <!-- Step Content by Type -->

            <!-- Info Step -->
            <div v-if="currentStep.type === 'info'" class="space-y-4">
              <div class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                <p>{{ currentStep.description }}</p>
              </div>
              <button
                v-if="!currentStep.completedAt"
                @click="completeCurrentStep()"
                :disabled="stepLoading"
                class="btn btn-primary"
              >
                {{ stepLoading ? 'Saving...' : 'Mark Complete' }}
              </button>
            </div>

            <!-- Form Step -->
            <div v-else-if="currentStep.type === 'form'">
              <OnboardingStepForm
                :step="currentStep"
                :disabled="!!currentStep.completedAt"
                @submit="completeCurrentStep"
              />
            </div>

            <!-- Upload Step -->
            <div v-else-if="currentStep.type === 'upload'">
              <OnboardingStepUpload
                :step="currentStep"
                :disabled="!!currentStep.completedAt"
                @submit="completeCurrentStep"
              />
            </div>

            <!-- Approval Step -->
            <div v-else-if="currentStep.type === 'approval'" class="space-y-4">
              <div class="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                <p>{{ currentStep.description }}</p>
              </div>
              <div v-if="!currentStep.completedAt" class="flex gap-3">
                <button
                  @click="completeCurrentStep({ approved: false, feedback: 'Changes requested' })"
                  :disabled="stepLoading"
                  class="btn btn-secondary"
                >
                  Request Changes
                </button>
                <button
                  @click="completeCurrentStep({ approved: true })"
                  :disabled="stepLoading"
                  class="btn btn-primary"
                >
                  {{ stepLoading ? 'Saving...' : 'Approve' }}
                </button>
              </div>
            </div>

            <!-- Navigation -->
            <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                @click="previousStep"
                :disabled="currentStepIndex === 0"
                class="btn btn-secondary"
                :class="{ 'opacity-50 cursor-not-allowed': currentStepIndex === 0 }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Previous
              </button>
              <button
                @click="nextStep"
                :disabled="currentStepIndex === checklist.steps.length - 1"
                class="btn btn-primary"
                :class="{ 'opacity-50 cursor-not-allowed': currentStepIndex === checklist.steps.length - 1 }"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import onboardingService from '@/services/onboarding.service'
import OnboardingProgress from '@/components/onboarding/OnboardingProgress.vue'
import OnboardingStepForm from '@/components/onboarding/OnboardingStepForm.vue'
import OnboardingStepUpload from '@/components/onboarding/OnboardingStepUpload.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const loading = ref(true)
const stepLoading = ref(false)
const checklist = ref(null)
const currentStepIndex = ref(0)

const currentStep = computed(() => {
  if (!checklist.value || !checklist.value.steps) return null
  return checklist.value.steps[currentStepIndex.value] || null
})

const completedCount = computed(() => {
  if (!checklist.value || !checklist.value.steps) return 0
  return checklist.value.steps.filter(s => s.completedAt).length
})

const overallProgress = computed(() => {
  if (!checklist.value || !checklist.value.steps || checklist.value.steps.length === 0) return 0
  return Math.round((completedCount.value / checklist.value.steps.length) * 100)
})

function goToStep(index) {
  if (index >= 0 && checklist.value && index < checklist.value.steps.length) {
    currentStepIndex.value = index
  }
}

function previousStep() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

function nextStep() {
  if (checklist.value && currentStepIndex.value < checklist.value.steps.length - 1) {
    currentStepIndex.value++
  }
}

async function completeCurrentStep(response) {
  if (!checklist.value || !currentStep.value) return
  if (currentStep.value.completedAt) return

  stepLoading.value = true
  try {
    const updated = await onboardingService.completeStep(
      checklist.value.id,
      currentStep.value.id,
      response || undefined
    )
    checklist.value = updated
    toast.success('Step completed')

    // Auto-advance to next incomplete step if available
    const nextIncomplete = checklist.value.steps.findIndex(
      (s, i) => i > currentStepIndex.value && !s.completedAt
    )
    if (nextIncomplete !== -1) {
      currentStepIndex.value = nextIncomplete
    }
  } catch (err) {
    console.error('Error completing step:', err)
    toast.error('Failed to complete step')
  } finally {
    stepLoading.value = false
  }
}

async function loadChecklist() {
  loading.value = true
  try {
    const id = route.params.id
    checklist.value = await onboardingService.getChecklist(id)

    // Start on the first incomplete step
    if (checklist.value && checklist.value.steps) {
      const firstIncomplete = checklist.value.steps.findIndex(s => !s.completedAt)
      if (firstIncomplete !== -1) {
        currentStepIndex.value = firstIncomplete
      }
    }
  } catch (err) {
    console.error('Error loading checklist:', err)
    toast.error('Failed to load onboarding checklist')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadChecklist()
})
</script>
