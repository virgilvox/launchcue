<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="modelValue" class="modal-overlay" @click="closeOnBackdrop && close()">
        <div class="modal-container modal-force-light" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="modal-close-btn" @click="close" aria-label="Close modal">
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
  }
})

const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
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
}

.modal-container {
  background-color: #fff;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 32rem;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgb(229, 231, 235);
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: rgb(17, 24, 39);
}

.modal-close-btn {
  color: rgb(107, 114, 128);
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  border-radius: 0.25rem;
}

.modal-close-btn:hover {
  color: rgb(17, 24, 39);
  background-color: rgb(243, 244, 246);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgb(229, 231, 235);
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

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .modal-container {
    background-color: rgb(31, 41, 55);
    color: rgb(229, 231, 235);
  }
  
  .modal-header,
  .modal-footer {
    border-color: rgb(55, 65, 81);
  }
  
  .modal-title {
    color: rgb(229, 231, 235);
  }
  
  .modal-close-btn {
    color: rgb(156, 163, 175);
  }
  
  .modal-close-btn:hover {
    color: rgb(229, 231, 235);
    background-color: rgb(55, 65, 81);
  }
}
</style> 