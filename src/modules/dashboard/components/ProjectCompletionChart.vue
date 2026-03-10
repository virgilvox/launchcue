<template>
  <div>
    <Bar v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-48 text-[var(--text-secondary)]">
      No project data available
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps({
  projects: {
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
  accentHot: '#E8503A',
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
    accentHot: getCssVar('--accent-hot'),
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

const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

const statusColorMap = computed(() => ({
  'Planning': colors.value.accentPrimary,
  'In Progress': colors.value.warning,
  'On Hold': colors.value.accentHot,
  'Completed': colors.value.success,
  'Cancelled': colors.value.danger,
}))

const statusCounts = computed(() => {
  const counts = {}
  statuses.forEach(s => { counts[s] = 0 })
  if (!Array.isArray(props.projects)) return counts
  props.projects.forEach(project => {
    const status = project.status || 'Planning'
    if (status in counts) {
      counts[status]++
    }
  })
  return counts
})

const hasData = computed(() => {
  return Array.isArray(props.projects) && props.projects.length > 0
})

const chartData = computed(() => ({
  labels: statuses,
  datasets: [
    {
      label: 'Projects',
      data: statuses.map(s => statusCounts.value[s]),
      backgroundColor: statuses.map(s => statusColorMap.value[s]),
      borderColor: statuses.map(s => statusColorMap.value[s]),
      borderWidth: 1,
      borderRadius: 4,
      barThickness: 28
    }
  ]
}))

const chartOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: colors.value.surfaceElevated,
      titleColor: colors.value.textPrimary,
      bodyColor: colors.value.textSecondary,
      borderColor: colors.value.borderLight,
      borderWidth: 1,
      padding: 12
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: colors.value.textSecondary,
        font: { size: 11 }
      },
      grid: {
        color: colors.value.borderLight,
      }
    },
    y: {
      ticks: {
        color: colors.value.textPrimary,
        font: { size: 12 }
      },
      grid: {
        display: false
      }
    }
  }
}))
</script>
