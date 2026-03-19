<template>
  <div class="bg-[var(--surface-elevated)] border-2 p-4" :class="hasRowError ? 'border-[var(--danger)]' : 'border-[var(--border-light)]'">
    <!-- Desktop grid layout -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
      <!-- Row number (desktop only) -->
      <div class="hidden md:flex items-center justify-center text-sm text-[var(--text-secondary)] md:col-span-1 pt-2">
        {{ index + 1 }}
      </div>

      <!-- Description -->
      <div class="col-span-1 md:col-span-3">
        <label class="form-label md:hidden">Description</label>
        <input
          type="text"
          :value="item.description"
          @input="onTextChange('description', $event)"
          @blur="blurred.description = true"
          placeholder="Item description"
          class="input text-sm w-full"
          :class="{ 'border-[var(--danger)]': descriptionInvalid }"
        />
        <p v-if="descriptionInvalid" class="text-xs text-[var(--danger)] mt-1">Description is required</p>
      </div>

      <!-- Quantity -->
      <div class="col-span-1 md:col-span-2">
        <label class="form-label md:hidden">Qty</label>
        <input
          type="number"
          :value="item.quantity"
          @input="onNumberChange('quantity', $event)"
          @blur="blurred.quantity = true"
          placeholder="Qty"
          min="0"
          step="1"
          class="input text-sm w-full"
          :class="{ 'border-[var(--danger)]': quantityInvalid }"
        />
        <p v-if="quantityInvalid" class="text-xs text-[var(--danger)] mt-1">Must be greater than 0</p>
      </div>

      <!-- Unit -->
      <div class="col-span-1 md:col-span-2">
        <label class="form-label md:hidden">Unit</label>
        <input
          type="text"
          :value="item.unit"
          @input="onTextChange('unit', $event)"
          placeholder="Unit"
          class="input text-sm w-full"
        />
      </div>

      <!-- Rate -->
      <div class="col-span-1 md:col-span-2">
        <label class="form-label md:hidden">Rate</label>
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">$</span>
          <input
            type="number"
            :value="item.rate"
            @input="onNumberChange('rate', $event)"
            @blur="blurred.rate = true"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="input text-sm pl-6 w-full"
            :class="{ 'border-[var(--danger)]': rateInvalid }"
          />
        </div>
        <p v-if="rateInvalid" class="text-xs text-[var(--danger)] mt-1">Must be greater than 0</p>
      </div>

      <!-- Computed Amount (display only) -->
      <div class="col-span-1 md:col-span-1 flex items-center pt-1 md:pt-2">
        <label class="form-label md:hidden mr-2">Amount</label>
        <span class="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {{ formatCurrency(amount) }}
        </span>
      </div>

      <!-- Remove button -->
      <div class="col-span-1 md:col-span-1 flex items-center pt-1 md:pt-1.5">
        <button
          type="button"
          @click="$emit('remove', item.id)"
          class="btn-icon p-1 text-[var(--danger)] hover:opacity-80"
          title="Remove line item"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
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
  showErrors: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update', 'remove'])

const blurred = reactive({
  description: false,
  quantity: false,
  rate: false,
})

const amount = computed(() => {
  return (props.item.quantity || 0) * (props.item.rate || 0)
})

const descriptionInvalid = computed(() => {
  return (blurred.description || props.showErrors) && (!props.item.description || props.item.description.trim() === '')
})

const quantityInvalid = computed(() => {
  return (blurred.quantity || props.showErrors) && (!props.item.quantity || props.item.quantity <= 0)
})

const rateInvalid = computed(() => {
  return (blurred.rate || props.showErrors) && (!props.item.rate || props.item.rate <= 0)
})

const hasRowError = computed(() => {
  return descriptionInvalid.value || quantityInvalid.value || rateInvalid.value
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
