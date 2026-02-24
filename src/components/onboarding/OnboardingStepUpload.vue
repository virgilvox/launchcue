<template>
  <div class="space-y-5">
    <!-- Step description -->
    <p v-if="step.description" class="text-sm text-gray-600 dark:text-gray-400">
      {{ step.description }}
    </p>

    <!-- Already completed -->
    <div v-if="disabled" class="pt-2">
      <p class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        This step has been completed.
      </p>
    </div>

    <!-- File Drop Zone -->
    <div v-else>
      <div
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        :class="[
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-wash)]'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
        ]"
        @click="triggerFileInput"
      >
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          @change="onFileSelect"
        />

        <div v-if="!selectedFile" class="space-y-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop your file here, or <span class="text-[var(--accent-primary)]">browse</span>
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Any file type accepted
            </p>
          </div>
        </div>

        <!-- Selected file preview -->
        <div v-else class="space-y-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-10 w-10 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p class="text-sm font-medium text-gray-800 dark:text-gray-200">
              {{ selectedFile.name }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ formatFileSize(selectedFile.size) }} &bull; {{ selectedFile.type || 'Unknown type' }}
            </p>
          </div>
          <button
            type="button"
            @click.stop="clearFile"
            class="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium"
          >
            Remove file
          </button>
        </div>
      </div>

      <!-- Submit button -->
      <div class="mt-4">
        <button
          type="button"
          @click="handleSubmit"
          :disabled="!selectedFile"
          class="btn btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !selectedFile }"
        >
          Upload &amp; Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

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

const selectedFile = ref(null)
const isDragging = ref(false)
const fileInputRef = ref(null)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

function onDragOver() {
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

function clearFile() {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i]
}

function handleSubmit() {
  if (!selectedFile.value) return
  emit('submit', {
    fileName: selectedFile.value.name,
    fileSize: selectedFile.value.size,
    fileType: selectedFile.value.type,
  })
}
</script>
