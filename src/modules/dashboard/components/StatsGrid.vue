<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="card"
    >
      <span class="overline">{{ stat.label }}</span>
      <p class="stat-number mt-2">{{ stat.value }}</p>
      <p v-if="stat.sub" class="text-caption mt-1 mono">{{ stat.sub }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { addDays, isWithinInterval, parseISO } from 'date-fns'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  projects: { type: Array, default: () => [] },
  clients: { type: Array, default: () => [] },
  campaigns: { type: Array, default: () => [] },
})

const safeTasks = computed(() => Array.isArray(props.tasks) ? props.tasks : [])
const safeProjects = computed(() => Array.isArray(props.projects) ? props.projects : [])
const safeClients = computed(() => Array.isArray(props.clients) ? props.clients : [])

const openTasks = computed(() =>
  safeTasks.value.filter(t => t.status !== 'Done').length
)

const activeProjects = computed(() =>
  safeProjects.value.filter(p => p.status === 'In Progress').length
)

const totalClients = computed(() => safeClients.value.length)

const upcomingDeadlines = computed(() => {
  const now = new Date()
  const nextWeek = addDays(now, 7)
  return safeTasks.value.filter(task => {
    if (!task.dueDate) return false
    try {
      const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate)
      return isWithinInterval(dueDate, { start: now, end: nextWeek })
    } catch {
      return false
    }
  }).length
})

const completionRate = computed(() => {
  if (safeTasks.value.length === 0) return null
  return Math.round(((safeTasks.value.length - openTasks.value) / safeTasks.value.length) * 100)
})

const stats = computed(() => [
  {
    label: 'OPEN TASKS',
    value: openTasks.value,
    sub: completionRate.value !== null ? `${completionRate.value}% complete` : null,
  },
  {
    label: 'ACTIVE PROJECTS',
    value: activeProjects.value,
    sub: `${safeProjects.value.length} total`,
  },
  {
    label: 'TOTAL CLIENTS',
    value: totalClients.value,
    sub: null,
  },
  {
    label: 'DUE THIS WEEK',
    value: upcomingDeadlines.value,
    sub: upcomingDeadlines.value > 0 ? 'next 7 days' : null,
  },
])
</script>
