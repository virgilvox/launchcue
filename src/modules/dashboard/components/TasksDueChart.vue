<template>
  <div>
    <Line v-if="hasData" :data="chartData" :options="chartOptions" />
    <div v-else class="flex items-center justify-center h-48 text-[var(--text-secondary)]">
      No upcoming tasks with due dates
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})

const isDark = computed(() => document.documentElement.classList.contains('dark'))

const weekBuckets = computed(() => {
  const now = new Date()
  const buckets = [0, 0, 0, 0]

  if (!Array.isArray(props.tasks)) return buckets

  for (let i = 0; i < 4; i++) {
    const weekStart = i === 0 ? startOfWeek(now, { weekStartsOn: 1 }) : startOfWeek(addWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

    props.tasks.forEach(task => {
      if (!task.dueDate) return
      try {
        const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate)
        if (isWithinInterval(dueDate, { start: weekStart, end: weekEnd })) {
          buckets[i]++
        }
      } catch {
        // Skip invalid dates
      }
    })
  }

  return buckets
})

const hasData = computed(() => {
  return weekBuckets.value.some(count => count > 0)
})

const chartData = computed(() => ({
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  datasets: [
    {
      label: 'Tasks Due',
      data: weekBuckets.value,
      borderColor: '#8B5CF6',  // purple-500
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      pointBackgroundColor: '#8B5CF6',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true,
      tension: 0.3
    }
  ]
}))

const chartOptions = computed(() => ({
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
      padding: 12,
      callbacks: {
        label: function (context) {
          const count = context.parsed.y
          return ` ${count} task${count !== 1 ? 's' : ''} due`
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: isDark.value ? '#9CA3AF' : '#6B7280',
        font: { size: 12 }
      },
      grid: {
        color: isDark.value ? '#374151' : '#F3F4F6'
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        color: isDark.value ? '#9CA3AF' : '#6B7280',
        font: { size: 11 }
      },
      grid: {
        color: isDark.value ? '#374151' : '#F3F4F6'
      }
    }
  }
}))
</script>
