<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 ml-auto max-w-sm w-full">
    <h3 class="heading-section mb-4">Invoice Summary</h3>

    <div class="space-y-3">
      <!-- Subtotal -->
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-600 dark:text-gray-300">Subtotal</span>
        <span class="text-sm font-semibold text-gray-900 dark:text-white">
          {{ formatCurrency(subtotal, currency) }}
        </span>
      </div>

      <!-- Tax mode toggle -->
      <div class="flex items-center gap-2 pt-1">
        <button
          type="button"
          :class="[
            'text-xs px-2 py-1 rounded-md transition-colors',
            taxMode === 'rate'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          ]"
          @click="taxMode = 'rate'"
        >
          Tax Rate %
        </button>
        <button
          type="button"
          :class="[
            'text-xs px-2 py-1 rounded-md transition-colors',
            taxMode === 'fixed'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          ]"
          @click="taxMode = 'fixed'"
        >
          Fixed Amount
        </button>
      </div>

      <!-- Tax row -->
      <div class="flex justify-between items-center gap-3">
        <span class="text-sm text-gray-600 dark:text-gray-300 shrink-0">Tax</span>

        <!-- Tax rate input -->
        <div v-if="taxMode === 'rate'" class="flex items-center gap-2">
          <div class="relative">
            <input
              type="number"
              :value="taxRate"
              @input="onTaxRateChange"
              placeholder="0"
              min="0"
              max="100"
              step="0.1"
              class="input text-sm text-right w-20 pr-6"
            />
            <span class="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">%</span>
          </div>
          <span class="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {{ formatCurrency(computedTaxFromRate, currency) }}
          </span>
        </div>

        <!-- Fixed tax amount input -->
        <div v-else class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">$</span>
          <input
            type="number"
            :value="tax"
            @input="onFixedTaxChange"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="input text-sm pl-6 text-right w-28"
          />
        </div>
      </div>

      <!-- Total -->
      <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
        <span class="text-base font-bold text-gray-900 dark:text-white">Total</span>
        <span class="text-lg font-bold text-gray-900 dark:text-white">
          {{ formatCurrency(total, currency) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  lineItems: {
    type: Array,
    default: () => [],
  },
  tax: {
    type: Number,
    default: null,
  },
  taxRate: {
    type: Number,
    default: null,
  },
  currency: {
    type: String,
    default: 'USD',
  },
})

const emit = defineEmits(['update:tax', 'update:taxRate'])

const taxMode = ref(props.taxRate != null ? 'rate' : 'fixed')

const subtotal = computed(() => {
  return props.lineItems.reduce((sum, item) => {
    return sum + ((item.quantity || 0) * (item.rate || 0))
  }, 0)
})

const computedTaxFromRate = computed(() => {
  if (props.taxRate == null) return 0
  return subtotal.value * (props.taxRate / 100)
})

const effectiveTax = computed(() => {
  if (taxMode.value === 'rate') {
    return computedTaxFromRate.value
  }
  return props.tax || 0
})

const total = computed(() => {
  return subtotal.value + effectiveTax.value
})

function onTaxRateChange(event) {
  const value = parseFloat(event.target.value) || 0
  emit('update:taxRate', value)
  emit('update:tax', subtotal.value * (value / 100))
}

function onFixedTaxChange(event) {
  const value = parseFloat(event.target.value) || 0
  emit('update:tax', value)
  emit('update:taxRate', null)
}

// When switching to rate mode, sync up the tax amount
watch(taxMode, (newMode) => {
  if (newMode === 'rate') {
    const rate = props.taxRate || 0
    emit('update:taxRate', rate)
    emit('update:tax', subtotal.value * (rate / 100))
  }
})
</script>
