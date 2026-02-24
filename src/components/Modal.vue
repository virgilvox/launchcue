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
          class="modal-container"
          :class="sizeClass"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          @click.stop
        >
          <div class="modal-header">
            <h3 :id="titleId" class="modal-title">{{ title }}</h3>
            <button
              class="modal-close-btn"
              @click="close"
              aria-label="Close modal"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>

          <div class="modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
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

const titleId = computed(() => `modal-title-${Math.random().toString(36).slice(2, 9)}`)

// Save the triggering element before the transition starts (not after it ends)
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    previousActiveElement.value = document.activeElement
  }
})

const sizeClass = computed(() => ({
  'sm:max-w-sm': props.size === 'sm',
  'sm:max-w-lg': props.size === 'md',
  'sm:max-w-2xl': props.size === 'lg',
  'sm:max-w-4xl': props.size === 'xl',
}))

const close = () => {
  emit('update:modelValue', false)
}

const onAfterEnter = () => {
  nextTick(() => {
    const firstFocusable = modalRef.value?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (firstFocusable) {
      firstFocusable.focus()
    } else {
      modalRef.value?.focus()
    }
  })
}

const onAfterLeave = () => {
  if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function') {
    previousActiveElement.value.focus()
  }
  previousActiveElement.value = null
}

const onKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
    return
  }

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
  background-color: rgba(0, 0, 0, 0.6);
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
  background-color: var(--surface-elevated);
  border: 2px solid var(--border);
  box-shadow: 6px 6px 0 0 var(--shadow-color);
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  color: var(--text-primary);
}

@media (min-width: 640px) {
  .modal-container {
    height: auto;
    max-height: 85vh;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 2px solid var(--border);
}

.modal-title {
  font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close-btn {
  background: transparent;
  border: 2px solid transparent;
  padding: 0.375rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  border-color: var(--border);
  color: var(--text-primary);
  background-color: var(--surface);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  border-top: 2px solid var(--border);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.15s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
