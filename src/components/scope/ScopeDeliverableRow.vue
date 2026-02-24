<template>
  <div class="bg-[var(--surface-elevated)] border border-[var(--border-light)] p-4">
    <!-- Mobile-stacked / Desktop-inline grid -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
      <!-- Row number -->
      <div class="hidden md:flex items-center justify-center text-sm text-[var(--text-secondary)] md:col-span-1 pt-2">
        {{ index + 1 }}
      </div>

      <!-- Title -->
      <div class="col-span-1 md:col-span-3">
        <label class="form-label md:hidden">Title</label>
        <input
          type="text"
          :value="deliverable.title"
          @input="onTextChange('title', $event)"
          placeholder="Deliverable title"
          class="input text-sm"
        />
      </div>

      <!-- Quantity -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Qty</label>
        <input
          type="number"
          :value="deliverable.quantity"
          @input="onNumberChange('quantity', $event)"
          placeholder="Qty"
          min="0"
          step="1"
          class="input text-sm w-full"
        />
      </div>

      <!-- Unit -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Unit</label>
        <input
          type="text"
          :value="deliverable.unit"
          @input="onTextChange('unit', $event)"
          placeholder="Unit"
          class="input text-sm w-full"
        />
      </div>

      <!-- Rate -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Rate</label>
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-secondary)]">$</span>
          <input
            type="number"
            :value="deliverable.rate"
            @input="onNumberChange('rate', $event)"
            placeholder="0.00"
            min="0"
            step="0.01"
            class="input text-sm pl-6 w-full"
          />
        </div>
      </div>

      <!-- Estimated Hours -->
      <div class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Hours</label>
        <input
          type="number"
          :value="deliverable.estimatedHours"
          @input="onNumberChange('estimatedHours', $event)"
          placeholder="Hrs"
          min="0"
          step="0.5"
          class="input text-sm w-full"
        />
      </div>

      <!-- Computed Amount -->
      <div class="col-span-1 md:col-span-1 flex items-center pt-1 md:pt-2">
        <label class="form-label md:hidden mr-2">Amount</label>
        <span class="text-sm font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {{ formatCurrency(amount) }}
        </span>
      </div>

      <!-- Status (conditional) -->
      <div v-if="showStatus" class="col-span-1 md:col-span-1">
        <label class="form-label md:hidden">Status</label>
        <select
          :value="deliverable.status || 'pending'"
          @change="onTextChange('status', $event)"
          class="input text-sm"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <!-- Actions -->
      <div class="col-span-1 md:col-span-1 flex items-center gap-1 pt-1 md:pt-1.5">
        <button
          type="button"
          @click="$emit('move-up', index)"
          class="btn-icon p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Move up"
        >
          <ChevronUpIcon class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="$emit('move-down', index)"
          class="btn-icon p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Move down"
        >
          <ChevronDownIcon class="h-4 w-4" />
        </button>
        <button
          type="button"
          @click="toggleDescription"
          class="btn-icon p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          :title="showDescription ? 'Hide description' : 'Show description'"
        >
          <ChevronDownIcon v-if="!showDescription" class="h-4 w-4 rotate-0 transition-transform" />
          <ChevronUpIcon v-else class="h-4 w-4 transition-transform" />
        </button>
        <button
          type="button"
          @click="$emit('remove', deliverable.id)"
          class="btn-icon p-1 text-[var(--danger)] hover:opacity-80"
          title="Remove deliverable"
        >
          <TrashIcon class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Collapsible Description -->
    <div v-if="showDescription" class="mt-3 md:ml-[calc(100%/12)]">
      <label class="form-label">Description</label>
      <textarea
        :value="deliverable.description"
        @input="onTextChange('description', $event)"
        placeholder="Describe this deliverable..."
        rows="2"
        class="form-textarea text-sm"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  deliverable: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  showStatus: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update', 'remove', 'move-up', 'move-down'])

const showDescription = ref(false)

const amount = computed(() => {
  return (props.deliverable.quantity || 0) * (props.deliverable.rate || 0)
})

function toggleDescription() {
  showDescription.value = !showDescription.value
}

function onTextChange(field, event) {
  emit('update', {
    ...props.deliverable,
    [field]: event.target.value,
  })
}

function onNumberChange(field, event) {
  emit('update', {
    ...props.deliverable,
    [field]: parseFloat(event.target.value) || 0,
  })
}
</script>
