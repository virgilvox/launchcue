<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h3 class="heading-card">Outstanding Invoices</h3>
      <router-link to="/invoices" class="btn btn-ghost btn-sm">VIEW ALL</router-link>
    </div>

    <div v-if="!outstanding.length" class="text-center py-6">
      <p class="text-caption">No outstanding invoices</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr>
            <th>INVOICE</th>
            <th>CLIENT</th>
            <th class="text-right">AMOUNT</th>
            <th class="text-right">OVERDUE</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="inv in outstanding"
            :key="inv.id"
            :class="[
              getDaysOverdue(inv) > 30 ? 'bg-[var(--accent-hot-wash)]' : ''
            ]"
          >
            <td class="mono">{{ inv.invoiceNumber || '—' }}</td>
            <td>{{ inv.clientName || '—' }}</td>
            <td class="text-right mono">{{ formatCurrency(inv.total) }}</td>
            <td class="text-right">
              <span
                v-if="getDaysOverdue(inv) > 0"
                :class="['badge', getDaysOverdue(inv) > 30 ? 'badge-red' : 'badge-yellow']"
              >
                {{ getDaysOverdue(inv) }}d
              </span>
              <span v-else class="text-caption">Current</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  invoices: { type: Array, default: () => [] },
})

const outstanding = computed(() =>
  props.invoices
    .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
    .slice(0, 5)
)

function getDaysOverdue(inv) {
  if (!inv.dueDate) return 0
  const diff = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}
</script>
