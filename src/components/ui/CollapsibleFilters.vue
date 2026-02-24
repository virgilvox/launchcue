<template>
  <div>
    <!-- Mobile: toggle button -->
    <button
      v-if="isMobile"
      @click="isExpanded = !isExpanded"
      class="btn btn-outline w-full flex items-center justify-between mb-3"
    >
      <span>
        Filters
        <span v-if="activeCount > 0" class="ml-1.5 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-[var(--accent-primary-wash)] text-[var(--accent-primary)]">
          {{ activeCount }}
        </span>
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 transition-transform"
        :class="{ 'rotate-180': isExpanded }"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>

    <!-- Filters content -->
    <div v-show="!isMobile || isExpanded" :class="isMobile ? 'flex flex-col gap-3 mb-4' : ''">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useResponsive } from '@/composables/useResponsive'

defineProps({
  activeCount: {
    type: Number,
    default: 0
  }
})

const { isMobile } = useResponsive()
const isExpanded = ref(false)
</script>
