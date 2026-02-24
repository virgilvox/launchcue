<template>
  <div class="relative">
    <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-48 text-[var(--text-secondary)]">
      No task data available
    </div>
    <div v-if="hasData" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center">
        <p class="text-3xl font-bold text-[var(--text-primary)]">{{ totalTasks }}</p>
        <p class="text-sm text-[var(--text-secondary)]">Total</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Theme colors resolved from CSS custom properties after mount
const colors = ref({
  accentPrimary: '#7C3AED',
  warning: '#F59E0B',
  danger: '#DC2626',
  success: '#0D9488',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6560',
  borderLight: '#D6D0C8',
  surface: '#F5F0EB',
})

onMounted(() => {
  colors.value = {
    accentPrimary: getCssVar('--accent-primary'),
    warning: getCssVar('--warning'),
    danger: getCssVar('--danger'),
    success: getCssVar('--success'),
    surfaceElevated: getCssVar('--surface-elevated'),
    textPrimary: getCssVar('--text-primary'),
    textSecondary: getCssVar('--text-secondary'),
    borderLight: getCssVar('--border-light'),
    surface: getCssVar('--surface'),
  }
})

const statusCounts = computed(() => {
  const counts = {
    'To Do': 0,
    'In Progress': 0,
    'Blocked': 0,
    'Done': 0
  }
  if (!Array.isArray(props.tasks)) return counts
  props.tasks.forEach(task => {
    if (task.status in counts) {
      counts[task.status]++
    }
  })
  return counts
})

const totalTasks = computed(() => {
  return Array.isArray(props.tasks) ? props.tasks.length : 0
})

const hasData = computed(() => totalTasks.value > 0)

const chartData = computed(() => ({
  labels: ['To Do', 'In Progress', 'Blocked', 'Done'],
  datasets: [
    {
      data: [
        statusCounts.value['To Do'],
        statusCounts.value['In Progress'],
        statusCounts.value['Blocked'],
        statusCounts.value['Done']
      ],
      backgroundColor: [
        colors.value.accentPrimary,
        colors.value.warning,
        colors.value.danger,
        colors.value.success,
      ],
      borderColor: [
        colors.value.accentPrimary,
        colors.value.warning,
        colors.value.danger,
        colors.value.success,
      ],
      borderWidth: 2,
      hoverOffset: 6
    }
  ]
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: colors.value.textSecondary,
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: colors.value.surfaceElevated,
      titleColor: colors.value.textPrimary,
      bodyColor: colors.value.textSecondary,
      borderColor: colors.value.borderLight,
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: function (context) {
          const value = context.parsed
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return ` ${context.label}: ${value} (${pct}%)`
        }
      }
    }
  }
}))
</script>
