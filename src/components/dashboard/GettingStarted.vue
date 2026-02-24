<template>
  <div v-if="!dismissed" class="card card-featured mb-8">
    <div class="flex justify-between items-start mb-4">
      <div>
        <span class="overline text-[var(--accent-hot)]">GETTING STARTED</span>
        <h3 class="heading-section mt-1">Set up your workspace</h3>
      </div>
      <button @click="dismiss" class="btn btn-ghost btn-sm">
        I'LL EXPLORE ON MY OWN
      </button>
    </div>

    <!-- Progress bar -->
    <div class="progress-brutal mb-4">
      <div class="progress-brutal-fill" :style="{ width: progressPercent + '%' }"></div>
    </div>
    <p class="text-caption mb-4">{{ completedCount }}/{{ steps.length }} completed</p>

    <!-- Steps -->
    <div class="space-y-2">
      <router-link
        v-for="step in steps"
        :key="step.id"
        :to="step.route"
        :class="[
          'flex items-center gap-3 p-3 border-2 transition-colors',
          step.completed
            ? 'border-[var(--border-light)] bg-[var(--bg)]'
            : 'border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer'
        ]"
      >
        <div
          :class="[
            'w-6 h-6 border-2 flex items-center justify-center flex-shrink-0',
            step.completed
              ? 'border-[var(--accent-hot)] bg-[var(--accent-hot)]'
              : 'border-[var(--border)]'
          ]"
        >
          <CheckIcon v-if="step.completed" class="h-4 w-4 text-white" />
        </div>
        <div class="flex-1">
          <p :class="['text-body-sm font-medium', step.completed ? 'line-through text-[var(--text-secondary)]' : '']">
            {{ step.label }}
          </p>
        </div>
        <ChevronRightIcon v-if="!step.completed" class="h-4 w-4 text-[var(--text-secondary)]" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CheckIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  hasTeam: Boolean,
  hasClient: Boolean,
  hasProject: Boolean,
  hasTask: Boolean,
  hasBrainDump: Boolean,
})

const STORAGE_KEY = 'launchcue-onboarding-dismissed'
const dismissed = ref(false)

onMounted(() => {
  dismissed.value = localStorage.getItem(STORAGE_KEY) === 'true'
})

function dismiss() {
  dismissed.value = true
  localStorage.setItem(STORAGE_KEY, 'true')
}

const steps = computed(() => [
  { id: 'team', label: 'Create or join a team', route: '/team', completed: props.hasTeam },
  { id: 'client', label: 'Add your first client', route: '/clients', completed: props.hasClient },
  { id: 'project', label: 'Create a project', route: '/projects', completed: props.hasProject },
  { id: 'task', label: 'Add a task', route: '/tasks', completed: props.hasTask },
  { id: 'braindump', label: 'Try Brain Dump', route: '/brain-dump', completed: props.hasBrainDump },
])

const completedCount = computed(() => steps.value.filter(s => s.completed).length)
const progressPercent = computed(() => Math.round((completedCount.value / steps.value.length) * 100))
</script>
