<template>
  <form @submit.prevent="handleSubmit" class="space-y-5">
    <div v-for="field in step.formFields" :key="field.id" class="space-y-1.5">
      <!-- Text Input -->
      <template v-if="field.type === 'text'">
        <label :for="`field-${field.id}`" class="label">
          {{ field.label }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <input
          :id="`field-${field.id}`"
          v-model="formData[field.id]"
          type="text"
          class="input"
          :required="field.required"
          :disabled="disabled"
          :placeholder="`Enter ${field.label.toLowerCase()}`"
        />
      </template>

      <!-- Textarea -->
      <template v-else-if="field.type === 'textarea'">
        <label :for="`field-${field.id}`" class="label">
          {{ field.label }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <textarea
          :id="`field-${field.id}`"
          v-model="formData[field.id]"
          class="input"
          rows="4"
          :required="field.required"
          :disabled="disabled"
          :placeholder="`Enter ${field.label.toLowerCase()}`"
        ></textarea>
      </template>

      <!-- Select -->
      <template v-else-if="field.type === 'select'">
        <label :for="`field-${field.id}`" class="label">
          {{ field.label }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <select
          :id="`field-${field.id}`"
          v-model="formData[field.id]"
          class="input"
          :required="field.required"
          :disabled="disabled"
        >
          <option value="" disabled>Select an option</option>
          <option v-for="option in field.options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>
      </template>

      <!-- Checkbox -->
      <template v-else-if="field.type === 'checkbox'">
        <div class="flex items-center gap-2">
          <input
            :id="`field-${field.id}`"
            v-model="formData[field.id]"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] dark:bg-gray-700"
            :disabled="disabled"
          />
          <label :for="`field-${field.id}`" class="text-sm text-gray-700 dark:text-gray-300">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
        </div>
      </template>

      <!-- File -->
      <template v-else-if="field.type === 'file'">
        <label :for="`field-${field.id}`" class="label">
          {{ field.label }}
          <span v-if="field.required" class="text-red-500">*</span>
        </label>
        <input
          :id="`field-${field.id}`"
          type="file"
          class="block w-full text-sm text-gray-500 dark:text-gray-400
                 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0
                 file:text-sm file:font-medium
                 file:bg-[var(--accent-primary-wash)] file:text-[var(--accent-primary)]
                 dark:file:bg-[var(--accent-primary-wash)] dark:file:text-[var(--accent-primary)]
                 hover:file:bg-[var(--accent-primary-wash)]
                 file:cursor-pointer file:transition-colors"
          :required="field.required"
          :disabled="disabled"
          @change="handleFileSelect(field.id, $event)"
        />
        <p v-if="formData[field.id]" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Selected: {{ formData[field.id] }}
        </p>
      </template>
    </div>

    <!-- Submit -->
    <div v-if="!disabled" class="pt-2">
      <button type="submit" class="btn btn-primary" :disabled="!isValid">
        Submit
      </button>
    </div>

    <!-- Already completed message -->
    <div v-else class="pt-2">
      <p class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        This step has been completed.
      </p>
    </div>
  </form>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  step: {
    type: Object,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit'])

// Initialize form data from step fields
const formData = reactive(buildInitialData())

function buildInitialData() {
  const data = {}
  if (props.step.formFields) {
    for (const field of props.step.formFields) {
      if (field.type === 'checkbox') {
        data[field.id] = field.value ?? false
      } else {
        data[field.id] = field.value ?? ''
      }
    }
  }
  return data
}

const isValid = computed(() => {
  if (!props.step.formFields) return true
  for (const field of props.step.formFields) {
    if (field.required) {
      const val = formData[field.id]
      if (field.type === 'checkbox') {
        if (!val) return false
      } else {
        if (!val || (typeof val === 'string' && val.trim() === '')) return false
      }
    }
  }
  return true
})

function handleFileSelect(fieldId, event) {
  const file = event.target.files?.[0]
  if (file) {
    formData[fieldId] = file.name
  }
}

function handleSubmit() {
  if (!isValid.value) return
  emit('submit', { ...formData })
}
</script>
