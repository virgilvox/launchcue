<template>
  <Modal v-model="isOpen" :title="title" size="sm" :closeOnBackdrop="false">
    <p class="text-sm text-[var(--text-secondary)]">{{ message }}</p>

    <template #footer>
      <button class="btn btn-secondary" @click="cancel" :disabled="loading">Cancel</button>
      <button
        :class="['btn', destructive ? 'btn-danger' : 'btn-primary']"
        @click="confirm"
        :disabled="loading"
      >
        <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
        {{ confirmLabel }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm'
  },
  message: {
    type: String,
    default: 'Are you sure you want to proceed?'
  },
  confirmLabel: {
    type: String,
    default: 'Confirm'
  },
  destructive: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const isOpen = ref(props.modelValue)

watch(() => props.modelValue, (val) => { isOpen.value = val })
watch(isOpen, (val) => { emit('update:modelValue', val) })

const confirm = () => {
  emit('confirm')
}

const cancel = () => {
  isOpen.value = false
  emit('cancel')
}
</script>
