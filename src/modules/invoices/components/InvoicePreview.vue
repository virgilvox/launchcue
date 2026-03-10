<template>
  <div class="invoice-preview bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 sm:p-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)] uppercase">
          Invoice
        </h1>
        <div class="mt-2 space-y-0.5">
          <p v-if="invoice?.invoiceNumber" class="text-sm text-[var(--text-secondary)]">
            <span class="font-medium">Invoice #:</span> {{ invoice.invoiceNumber }}
          </p>
          <p v-if="invoice?.date" class="text-sm text-[var(--text-secondary)]">
            <span class="font-medium">Date:</span> {{ formatDate(invoice.date, { month: 'long' }) }}
          </p>
          <p v-if="invoice?.dueDate" class="text-sm text-[var(--text-secondary)]">
            <span class="font-medium">Due Date:</span> {{ formatDate(invoice.dueDate, { month: 'long' }) }}
          </p>
        </div>
      </div>
      <InvoiceStatusBadge v-if="invoice?.status" :status="invoice.status" />
    </div>

    <!-- From / To section -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">From</h3>
        <p class="text-sm font-medium text-[var(--text-primary)]">
          {{ invoice?.teamName || 'Your Team' }}
        </p>
        <p v-if="invoice?.teamEmail" class="text-sm text-[var(--text-secondary)]">
          {{ invoice.teamEmail }}
        </p>
        <p v-if="invoice?.teamAddress" class="text-sm text-[var(--text-secondary)] whitespace-pre-line">
          {{ invoice.teamAddress }}
        </p>
      </div>
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">To</h3>
        <p class="text-sm font-medium text-[var(--text-primary)]">
          {{ clientName || 'Client' }}
        </p>
        <p v-if="projectName" class="text-sm text-[var(--text-secondary)]">
          Project: {{ projectName }}
        </p>
        <p v-if="invoice?.clientEmail" class="text-sm text-[var(--text-secondary)]">
          {{ invoice.clientEmail }}
        </p>
        <p v-if="invoice?.clientAddress" class="text-sm text-[var(--text-secondary)] whitespace-pre-line">
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
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  #
                </th>
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  Description
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  Qty
                </th>
                <th class="text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  Unit
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  Rate
                </th>
                <th class="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] pb-3 border-b-2 border-[var(--border-light)]">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-light)]">
              <tr v-for="(item, idx) in lineItems" :key="item.id || idx">
                <td class="py-3 text-sm text-[var(--text-secondary)]">
                  {{ idx + 1 }}
                </td>
                <td class="py-3 text-sm font-medium text-[var(--text-primary)]">
                  {{ item.description || '-' }}
                </td>
                <td class="py-3 text-sm text-right text-[var(--text-primary)]">
                  {{ item.quantity || 0 }}
                </td>
                <td class="py-3 text-sm text-[var(--text-primary)]">
                  {{ item.unit || '-' }}
                </td>
                <td class="py-3 text-sm text-right text-[var(--text-primary)]">
                  {{ formatCurrency(item.rate || 0, invoice?.currency) }}
                </td>
                <td class="py-3 text-sm text-right font-medium text-[var(--text-primary)]">
                  {{ formatCurrency((item.quantity || 0) * (item.rate || 0), invoice?.currency) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- No line items -->
    <div v-else class="mb-8 text-center py-8 text-[var(--text-secondary)]">
      No line items added yet.
    </div>

    <!-- Summary totals -->
    <div class="flex justify-end mb-8">
      <div class="w-full max-w-xs space-y-2">
        <!-- Subtotal -->
        <div class="flex justify-between items-center">
          <span class="text-sm text-[var(--text-secondary)]">Subtotal</span>
          <span class="text-sm font-medium text-[var(--text-primary)]">
            {{ formatCurrency(subtotal, invoice?.currency) }}
          </span>
        </div>

        <!-- Tax -->
        <div v-if="taxAmount > 0" class="flex justify-between items-center">
          <span class="text-sm text-[var(--text-secondary)]">
            Tax
            <span v-if="invoice?.taxRate" class="text-[var(--text-secondary)]">
              ({{ invoice.taxRate }}%)
            </span>
          </span>
          <span class="text-sm font-medium text-[var(--text-primary)]">
            {{ formatCurrency(taxAmount, invoice?.currency) }}
          </span>
        </div>

        <!-- Total -->
        <div class="flex justify-between items-center pt-2 border-t-2 border-[var(--border-light)]">
          <span class="text-base font-bold text-[var(--text-primary)]">Total</span>
          <span class="text-xl font-bold text-[var(--text-primary)]">
            {{ formatCurrency(total, invoice?.currency) }}
          </span>
        </div>

        <!-- Payment status -->
        <div v-if="invoice?.paidAmount != null && invoice.paidAmount > 0" class="pt-2 space-y-1">
          <div class="flex justify-between items-center">
            <span class="text-sm text-[var(--success)]">Paid</span>
            <span class="text-sm font-medium text-[var(--success)]">
              {{ formatCurrency(invoice.paidAmount, invoice?.currency) }}
            </span>
          </div>
          <div v-if="balanceDue > 0" class="flex justify-between items-center">
            <span class="text-sm font-semibold text-[var(--text-primary)]">Balance Due</span>
            <span class="text-sm font-bold text-[var(--text-primary)]">
              {{ formatCurrency(balanceDue, invoice?.currency) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="invoice?.notes" class="invoice-preview-notes border-t border-[var(--border-light)] pt-6">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Notes</h3>
      <div
        class="prose prose-sm max-w-none text-[var(--text-secondary)]"
        v-html="invoice.notes"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'
import { formatDate } from '@/utils/dateFormatter'
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

  /* Force print-safe colors (override CSS vars) */
  .invoice-preview,
  .invoice-preview :deep(*) {
    color: black !important;
    background-color: white !important;
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
