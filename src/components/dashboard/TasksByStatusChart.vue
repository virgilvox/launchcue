<template>
  <div class="relative">
    <Doughnut v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
      No task data available
    </div>
    <div v-if="hasData" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center">
        <p class="text-3xl font-bold text-gray-800 dark:text-white">{{ totalTasks }}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Total</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

const isDark = computed(() => document.documentElement.classList.contains('dark'))

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
        '#60A5FA', // blue-400
        '#FBBF24', // yellow-400
        '#F87171', // red-400
        '#4ADE80'  // green-400
      ],
      borderColor: [
        '#3B82F6', // blue-500
        '#F59E0B', // yellow-500
        '#EF4444', // red-500
        '#22C55E'  // green-500
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
        color: isDark.value ? '#E5E7EB' : '#374151',
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: isDark.value ? '#374151' : '#FFFFFF',
      titleColor: isDark.value ? '#F9FAFB' : '#111827',
      bodyColor: isDark.value ? '#D1D5DB' : '#4B5563',
      borderColor: isDark.value ? '#4B5563' : '#E5E7EB',
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
