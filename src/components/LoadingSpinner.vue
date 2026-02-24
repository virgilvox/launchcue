<template>
  <div class="loading-spinner">
    <svg class="animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span v-if="text" class="loading-text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'medium'
  }
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

svg {
  color: var(--accent-primary);
  width: 2rem;
  height: 2rem;
}

.loading-spinner[data-size="small"] svg {
  width: 1.5rem;
  height: 1.5rem;
}

.loading-spinner[data-size="large"] svg {
  width: 3rem;
  height: 3rem;
}

.loading-text {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>