<template>
  <Teleport to="body">
    <Transition name="modal-fade" @after-enter="onAfterEnter" @after-leave="onAfterLeave">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click="closeOnBackdrop && close()"
        @keydown="onKeydown"
      >
        <div
          ref="modalRef"
          class="modal-container bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @click.stop
        >
          <div class="modal-header border-b border-gray-200 dark:border-gray-700">
            <h3 :id="titleId" class="modal-title text-gray-900 dark:text-gray-100">{{ title }}</h3>
            <button
              class="modal-close-btn text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              @click="close"
              aria-label="Close modal"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer border-t border-gray-200 dark:border-gray-700">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, nextTick } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue'])

const modalRef = ref(null)
const previousActiveElement = ref(null)

// Unique ID for aria-labelledby
const titleId = computed(() => `modal-title-${Math.random().toString(36).slice(2, 9)}`)

const sizeClass = computed(() => ({
  'sm:max-w-sm': props.size === 'sm',
  'sm:max-w-lg': props.size === 'md',
  'sm:max-w-2xl': props.size === 'lg',
  'sm:max-w-4xl': props.size === 'xl',
}))

const close = () => {
  emit('update:modelValue', false)
}

// Focus management
const onAfterEnter = () => {
  previousActiveElement.value = document.activeElement
  nextTick(() => {
    modalRef.value?.focus()
  })
}

const onAfterLeave = () => {
  if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function') {
    previousActiveElement.value.focus()
  }
  previousActiveElement.value = null
}

// Keyboard handling: Escape to close + focus trap
const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
    return
  }

  // Focus trap: keep Tab/Shift+Tab within the modal
  if (e.key === 'Tab' && modalRef.value) {
    const focusable = modalRef.value.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === modalRef.value) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 0;
}

@media (min-width: 640px) {
  .modal-overlay {
    padding: 1rem;
  }
}

.modal-container {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  border-radius: 0;
}

@media (min-width: 640px) {
  .modal-container {
    height: auto;
    max-height: 85vh;
    border-radius: 0.5rem;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.modal-close-btn {
  background: transparent;
  border: none;
  padding: 0.375rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* Transition animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
