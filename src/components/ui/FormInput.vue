<template>
  <div>
    <label v-if="label" :for="inputId" class="label">
      {{ label }}
      <span v-if="required" class="text-[var(--danger)]">*</span>
    </label>
    <input
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      class="form-input"
      v-bind="$attrs"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="hint" class="mt-1 text-xs text-[var(--text-secondary)]">{{ hint }}</p>
    <p v-if="error" class="mt-1 text-xs text-[var(--danger)]">{{ error }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])

const inputId = computed(() => props.id || `input-${props.label?.toLowerCase().replace(/\s+/g, '-') || Math.random().toString(36).slice(2)}`)
</script>

<script>
export default { inheritAttrs: false }
</script>
