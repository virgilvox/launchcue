<template>
  <div class="scope-preview bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ scope?.title || 'Untitled Scope' }}
        </h1>
        <div class="mt-1 space-y-0.5">
          <p v-if="clientName" class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium">Client:</span> {{ clientName }}
          </p>
          <p v-if="projectName" class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium">Project:</span> {{ projectName }}
          </p>
          <p v-if="scope?.createdAt" class="text-sm text-gray-500 dark:text-gray-400">
            Created: {{ formatDate(scope.createdAt) }}
          </p>
          <p v-if="scope?.updatedAt" class="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {{ formatDate(scope.updatedAt) }}
          </p>
        </div>
      </div>
      <span
        v-if="!isTemplate && scope?.status"
        :class="['badge', statusColorClass]"
      >
        {{ scope.status }}
      </span>
    </div>

    <!-- Deliverables Table -->
    <div v-if="deliverables.length > 0" class="mb-8">
      <h2 class="heading-section mb-3">Deliverables</h2>
      <div class="overflow-x-auto -mx-6 sm:-mx-8">
        <div class="inline-block min-w-full px-6 sm:px-8">
          <table class="min-w-full">
            <thead>
              <tr>
                <th class="text-left">#</th>
                <th class="text-left">Deliverable</th>
                <th class="text-right">Qty</th>
                <th class="text-left">Unit</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Hours</th>
                <th v-if="hasStatuses" class="text-left">Status</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in deliverables" :key="item.id || idx">
                <td class="text-gray-500 dark:text-gray-400">{{ idx + 1 }}</td>
                <td>
                  <div class="font-medium text-gray-900 dark:text-white">{{ item.title }}</div>
                  <div v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ item.description }}
                  </div>
                </td>
                <td class="text-right">{{ item.quantity || 0 }}</td>
                <td>{{ item.unit || '-' }}</td>
                <td class="text-right">{{ formatCurrency(item.rate || 0) }}</td>
                <td class="text-right">{{ item.estimatedHours || 0 }}h</td>
                <td v-if="hasStatuses">
                  <span :class="['badge', getStatusColor(item.status || 'pending')]">
                    {{ item.status || 'pending' }}
                  </span>
                </td>
                <td class="text-right font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency((item.quantity || 0) * (item.rate || 0)) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-gray-300 dark:border-gray-600">
                <td :colspan="hasStatuses ? 5 : 4" class="text-right font-semibold text-gray-700 dark:text-gray-200">
                  Totals
                </td>
                <td class="text-right font-semibold text-gray-900 dark:text-white">
                  {{ totalHours.toFixed(1) }}h
                </td>
                <td v-if="hasStatuses"></td>
                <td class="text-right font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(totalAmount) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- No Deliverables -->
    <div v-else class="mb-8 text-center py-8 text-gray-500 dark:text-gray-400">
      No deliverables added yet.
    </div>

    <!-- Total Amount (prominent) -->
    <div class="flex justify-end mb-8">
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg px-6 py-4 text-right">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(totalAmount) }}
        </p>
      </div>
    </div>

    <!-- Terms -->
    <div v-if="scope?.terms" class="scope-preview-terms">
      <h2 class="heading-section mb-3">Terms & Conditions</h2>
      <div
        class="prose prose-sm dark:prose-invert max-w-none"
        v-html="scope.terms"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import { getStatusColor } from '@/utils/statusColors'

const props = defineProps({
  scope: {
    type: Object,
    default: () => ({}),
  },
  clientName: {
    type: String,
    default: '',
  },
  projectName: {
    type: String,
    default: '',
  },
  isTemplate: {
    type: Boolean,
    default: false,
  },
})

const deliverables = computed(() => props.scope?.deliverables || [])

const hasStatuses = computed(() => {
  return !props.isTemplate && deliverables.value.some((d) => d.status)
})

const totalHours = computed(() => {
  return deliverables.value.reduce((sum, d) => sum + (d.estimatedHours || 0), 0)
})

const totalAmount = computed(() => {
  return deliverables.value.reduce((sum, d) => {
    return sum + (d.quantity || 0) * (d.rate || 0)
  }, 0)
})

const statusColorClass = computed(() => getStatusColor(props.scope?.status || 'draft'))

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
</script>

<style scoped>
@media print {
  .scope-preview {
    box-shadow: none;
    border: none;
    padding: 0;
    background: white;
    color: black;
  }

  .scope-preview :deep(.badge) {
    border: 1px solid #999;
    background: transparent !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .scope-preview :deep(table) {
    border-collapse: collapse;
  }

  .scope-preview :deep(th),
  .scope-preview :deep(td) {
    border-bottom: 1px solid #ddd;
    padding: 0.5rem 0.75rem;
    color: black;
  }

  .scope-preview :deep(thead) {
    background-color: #f3f4f6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .scope-preview :deep(tfoot tr) {
    border-top: 2px solid #333;
  }

  .scope-preview .bg-gray-50 {
    background-color: #f9fafb !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Hide dark mode classes in print */
  .scope-preview :deep(.dark\:bg-gray-700),
  .scope-preview :deep(.dark\:bg-gray-800) {
    background-color: white !important;
  }

  .scope-preview :deep(.dark\:text-white),
  .scope-preview :deep(.dark\:text-gray-200),
  .scope-preview :deep(.dark\:text-gray-300) {
    color: black !important;
  }
}
</style>
