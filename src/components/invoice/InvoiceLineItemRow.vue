<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
    <!-- Desktop grid layout -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
      <!-- Row number (desktop only) -->
      <div class="hidden md:flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 md:col-span-1 pt-2">
        {{ index + 1 }}
      </div>

      <!-- Description -->
      <div class="col-span-1 md:col-span-4">
        <label class="form-label md:hidden">Description</label>
        <input
          type="text"
          :value="item.description"
          @input="onTextChange('description', $event)"
          placeholder="Item description"
          class="input text-sm w-full"
        />
      </div>

      <!-- Quantity -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Qty</label>
        <input
          type="number"
          :value="item.quantity"
          @input="onNumberChange('quantity', $event)"
          placeholder="Qty"
          min="0"
          step="1"
          class="input text-sm max-w-[80px]"
        />
      </div>

      <!-- Unit -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Unit</label>
        <input
          type="text"
          :value="item.unit"
          @input="onTextChange('unit', $event)"
          placeholder="Unit"
          class="input text-sm max-w-[80px]"
        />
      </div>

      <!-- Rate -->
      <div class="col-span-1 md:col-span-2">
        <label class="form-label md:hidden">Rate</label>
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500">$</span>
          <input
            type="number"
            :value="item.rate"
            @input="onNumberChange('rate', $event)"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="input text-sm pl-6 max-w-[120px]"
          />
        </div>
      </div>

      <!-- Computed Amount (display only) -->
      <div class="col-span-1 md:col-span-2 flex items-center pt-1 md:pt-2">
        <label class="form-label md:hidden mr-2">Amount</label>
        <span class="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
          {{ formatCurrency(amount) }}
        </span>
      </div>

      <!-- Remove button -->
      <div class="col-span-1 md:col-span-1 flex items-center pt-1 md:pt-1.5">
        <button
          type="button"
          @click="$emit('remove', item.id)"
          class="btn-icon p-1 text-red-400 hover:text-red-500"
          title="Remove line item"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TrashIcon } from '@heroicons/vue/24/outline'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['update', 'remove'])

const amount = computed(() => {
  return (props.item.quantity || 0) * (props.item.rate || 0)
})

function onTextChange(field, event) {
  emit('update', {
    ...props.item,
    [field]: event.target.value,
    amount: field === 'quantity' || field === 'rate'
      ? (field === 'quantity' ? parseFloat(event.target.value) || 0 : props.item.quantity || 0) *
        (field === 'rate' ? parseFloat(event.target.value) || 0 : props.item.rate || 0)
      : amount.value,
  })
}

function onNumberChange(field, event) {
  const newValue = parseFloat(event.target.value) || 0
  const updatedItem = {
    ...props.item,
    [field]: newValue,
  }
  updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.rate || 0)
  emit('update', updatedItem)
}
</script>
