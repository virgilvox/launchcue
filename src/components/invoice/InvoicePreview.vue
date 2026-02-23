<template>
  <div class="invoice-preview bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sm:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-gray-900 dark:text-white uppercase">
          Invoice
        </h1>
        <div class="mt-2 space-y-0.5">
          <p v-if="invoice?.invoiceNumber" class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium">Invoice #:</span> {{ invoice.invoiceNumber }}
          </p>
          <p v-if="invoice?.date" class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium">Date:</span> {{ formatDate(invoice.date) }}
          </p>
          <p v-if="invoice?.dueDate" class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-medium">Due Date:</span> {{ formatDate(invoice.dueDate) }}
          </p>
        </div>
      </div>
      <InvoiceStatusBadge v-if="invoice?.status" :status="invoice.status" />
    </div>

    <!-- From / To section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">From</h3>
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ invoice?.teamName || 'Your Team' }}
        </p>
        <p v-if="invoice?.teamEmail" class="text-sm text-gray-600 dark:text-gray-300">
          {{ invoice.teamEmail }}
        </p>
        <p v-if="invoice?.teamAddress" class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {{ invoice.teamAddress }}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">To</h3>
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ clientName || 'Client' }}
        </p>
        <p v-if="projectName" class="text-sm text-gray-600 dark:text-gray-300">
          Project: {{ projectName }}
        </p>
        <p v-if="invoice?.clientEmail" class="text-sm text-gray-600 dark:text-gray-300">
          {{ invoice.clientEmail }}
        </p>
        <p v-if="invoice?.clientAddress" class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
          {{ invoice.clientAddress }}
        </p>
      </div>
    </div>

    <!-- Line Items Table -->
    <div v-if="lineItems.length > 0" class="mb-8">
      <div class="overflow-x-auto -mx-6 sm:-mx-8">
        <div class="inline-block min-w-full px-6 sm:px-8">
          <table class="min-w-full">
            <thead>
              <tr>
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  #
                </th>
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  Description
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  Qty
                </th>
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  Unit
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  Rate
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 pb-3 border-b-2 border-gray-200 dark:border-gray-600">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="(item, idx) in lineItems" :key="item.id || idx">
                <td class="py-3 text-sm text-gray-500 dark:text-gray-400">
                  {{ idx + 1 }}
                </td>
                <td class="py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {{ item.description || '-' }}
                </td>
                <td class="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                  {{ item.quantity || 0 }}
                </td>
                <td class="py-3 text-sm text-gray-700 dark:text-gray-300">
                  {{ item.unit || '-' }}
                </td>
                <td class="py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                  {{ formatCurrency(item.rate || 0, invoice?.currency) }}
                </td>
                <td class="py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency((item.quantity || 0) * (item.rate || 0), invoice?.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- No line items -->
    <div v-else class="mb-8 text-center py-8 text-gray-500 dark:text-gray-400">
      No line items added yet.
    </div>

    <!-- Summary totals -->
    <div class="flex justify-end mb-8">
      <div class="w-full max-w-xs space-y-2">
        <!-- Subtotal -->
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600 dark:text-gray-300">Subtotal</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ formatCurrency(subtotal, invoice?.currency) }}
          </span>
        </div>

        <!-- Tax -->
        <div v-if="taxAmount > 0" class="flex justify-between items-center">
          <span class="text-sm text-gray-600 dark:text-gray-300">
            Tax
            <span v-if="invoice?.taxRate" class="text-gray-400 dark:text-gray-500">
              ({{ invoice.taxRate }}%)
            </span>
          </span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ formatCurrency(taxAmount, invoice?.currency) }}
          </span>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-center pt-2 border-t-2 border-gray-300 dark:border-gray-600">
          <span class="text-base font-bold text-gray-900 dark:text-white">Total</span>
          <span class="text-xl font-bold text-gray-900 dark:text-white">
            {{ formatCurrency(total, invoice?.currency) }}
          </span>
        </div>

        <!-- Payment status -->
        <div v-if="invoice?.paidAmount != null && invoice.paidAmount > 0" class="pt-2 space-y-1">
          <div class="flex justify-between items-center">
            <span class="text-sm text-green-600 dark:text-green-400">Paid</span>
            <span class="text-sm font-medium text-green-600 dark:text-green-400">
              {{ formatCurrency(invoice.paidAmount, invoice?.currency) }}
            </span>
          </div>
          <div v-if="balanceDue > 0" class="flex justify-between items-center">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">Balance Due</span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">
              {{ formatCurrency(balanceDue, invoice?.currency) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="invoice?.notes" class="invoice-preview-notes border-t border-gray-200 dark:border-gray-700 pt-6">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Notes</h3>
      <div
        class="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300"
        v-html="invoice.notes"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import InvoiceStatusBadge from './InvoiceStatusBadge.vue'

const props = defineProps({
  invoice: {
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
})

const lineItems = computed(() => props.invoice?.lineItems || [])

const subtotal = computed(() => {
  return lineItems.value.reduce((sum, item) => {
    return sum + ((item.quantity || 0) * (item.rate || 0))
  }, 0)
})

const taxAmount = computed(() => {
  if (props.invoice?.tax != null) return props.invoice.tax
  if (props.invoice?.taxRate != null) return subtotal.value * (props.invoice.taxRate / 100)
  return 0
})

const total = computed(() => {
  return subtotal.value + taxAmount.value
})

const balanceDue = computed(() => {
  return total.value - (props.invoice?.paidAmount || 0)
})

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
  .invoice-preview {
    box-shadow: none;
    border: none;
    padding: 0;
    background: white;
    color: black;
  }

  .invoice-preview :deep(table) {
    border-collapse: collapse;
  }

  .invoice-preview :deep(th),
  .invoice-preview :deep(td) {
    border-bottom: 1px solid #ddd;
    padding: 0.5rem 0.75rem;
    color: black;
  }

  .invoice-preview :deep(thead th) {
    border-bottom-width: 2px;
    border-bottom-color: #333;
  }

  .invoice-preview :deep(tbody tr:last-child td) {
    border-bottom-color: #999;
  }

  /* Force print-safe backgrounds */
  .invoice-preview .bg-white,
  .invoice-preview :deep(.dark\:bg-gray-800) {
    background-color: white !important;
  }

  /* Force print-safe text colors */
  .invoice-preview :deep(.dark\:text-white),
  .invoice-preview :deep(.dark\:text-gray-200),
  .invoice-preview :deep(.dark\:text-gray-300) {
    color: black !important;
  }

  .invoice-preview :deep(.dark\:text-gray-400),
  .invoice-preview :deep(.dark\:text-gray-500) {
    color: #666 !important;
  }

  /* Hide interactive / UI-only elements */
  .invoice-preview :deep(button),
  .invoice-preview :deep(.btn-icon) {
    display: none !important;
  }

  /* Ensure borders are visible */
  .invoice-preview :deep(.border-t),
  .invoice-preview :deep(.border-t-2) {
    border-color: #333 !important;
  }

  /* Notes section */
  .invoice-preview-notes {
    border-top: 1px solid #ddd !important;
  }

  .invoice-preview-notes :deep(.prose) {
    color: #333 !important;
  }
}
</style>
