<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
    <div
      v-for="stat in stats"
      :key="stat.label"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-5 flex items-center space-x-4 border-t-4 hover:shadow-lg transition-shadow duration-200"
      :style="{ borderTopColor: stat.borderColor }"
    >
      <div
        class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        :class="stat.iconBg"
      >
        <component :is="stat.icon" class="w-6 h-6" :class="stat.iconColor" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{{ stat.label }}</p>
        <div class="flex items-baseline space-x-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</p>
          <span
            v-if="stat.trend !== null && stat.trend !== undefined"
            class="flex items-center text-xs font-medium"
            :class="stat.trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
          >
            <svg
              v-if="stat.trend >= 0"
              class="w-3 h-3 mr-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
            <svg
              v-else
              class="w-3 h-3 mr-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
            {{ stat.trendLabel }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { addDays, isWithinInterval, parseISO } from 'date-fns'
import {
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  BoltIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  projects: {
    type: Array,
    default: () => []
  },
  clients: {
    type: Array,
    default: () => []
  },
  campaigns: {
    type: Array,
    default: () => []
  }
})

const safeTasks = computed(() => Array.isArray(props.tasks) ? props.tasks : [])
const safeProjects = computed(() => Array.isArray(props.projects) ? props.projects : [])
const safeClients = computed(() => Array.isArray(props.clients) ? props.clients : [])

const totalTasks = computed(() => safeTasks.value.length)

const openTasks = computed(() =>
  safeTasks.value.filter(t => t.status !== 'Done').length
)

const totalProjects = computed(() => safeProjects.value.length)

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
  if (totalTasks.value === 0) return null
  return Math.round(((totalTasks.value - openTasks.value) / totalTasks.value) * 100)
})

const stats = computed(() => [
  {
    label: 'Total Tasks',
    value: totalTasks.value,
    icon: ClipboardDocumentListIcon,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: '#3b82f6',
    trend: null,
    trendLabel: ''
  },
  {
    label: 'Open Tasks',
    value: openTasks.value,
    icon: ClipboardDocumentCheckIcon,
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: '#eab308',
    trend: completionRate.value !== null ? (completionRate.value >= 50 ? 1 : -1) : null,
    trendLabel: completionRate.value !== null ? `${completionRate.value}% done` : ''
  },
  {
    label: 'Total Projects',
    value: totalProjects.value,
    icon: FolderIcon,
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderColor: '#a855f7',
    trend: null,
    trendLabel: ''
  },
  {
    label: 'Active Projects',
    value: activeProjects.value,
    icon: BoltIcon,
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: '#22c55e',
    trend: totalProjects.value > 0 ? 1 : null,
    trendLabel: totalProjects.value > 0 ? `${Math.round((activeProjects.value / totalProjects.value) * 100)}% active` : ''
  },
  {
    label: 'Total Clients',
    value: totalClients.value,
    icon: UserGroupIcon,
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    borderColor: '#6366f1',
    trend: null,
    trendLabel: ''
  },
  {
    label: 'Upcoming Deadlines',
    value: upcomingDeadlines.value,
    icon: CalendarDaysIcon,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    borderColor: '#ef4444',
    trend: upcomingDeadlines.value > 0 ? -1 : null,
    trendLabel: upcomingDeadlines.value > 0 ? `Due in 7 days` : ''
  }
])
</script>
