<template>
  <div>
    <Bar v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-48 text-[var(--text-secondary)]">
      No project data available
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

const isDark = computed(() => document.documentElement.classList.contains('dark'))

const statuses = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']

const statusColors = {
  'Planning': '#818CF8',      // indigo-400
  'In Progress': '#FBBF24',   // yellow-400
  'On Hold': '#FB923C',       // orange-400
  'Completed': '#4ADE80',     // green-400
  'Cancelled': '#F87171'      // red-400
}

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
      backgroundColor: statuses.map(s => statusColors[s]),
      borderColor: statuses.map(s => statusColors[s]),
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
      backgroundColor: isDark.value ? '#374151' : '#FFFFFF',
      titleColor: isDark.value ? '#F9FAFB' : '#111827',
      bodyColor: isDark.value ? '#D1D5DB' : '#4B5563',
      borderColor: isDark.value ? '#4B5563' : '#E5E7EB',
      borderWidth: 1,
      padding: 12
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: isDark.value ? '#9CA3AF' : '#6B7280',
        font: { size: 11 }
      },
      grid: {
        color: isDark.value ? '#374151' : '#F3F4F6'
      }
    },
    y: {
      ticks: {
        color: isDark.value ? '#D1D5DB' : '#374151',
        font: { size: 12 }
      },
      grid: {
        display: false
      }
    }
  }
}))
</script>
