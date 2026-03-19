<template>
  <div :class="className">
    <!-- Card skeleton: grid layout matching project/client/note card grids -->
    <template v-if="type === 'card'">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in count"
          :key="i"
          class="skeleton-card border-2 border-[var(--border-light)] bg-[var(--surface-elevated)] p-6"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="skeleton-line h-5 w-3/5"></div>
            <div class="skeleton-line h-5 w-5"></div>
          </div>
          <div class="skeleton-line h-4 w-1/4 mb-4"></div>
          <div class="skeleton-line h-3 w-full mb-2"></div>
          <div class="skeleton-line h-3 w-4/5 mb-4"></div>
          <div class="border-t-2 border-[var(--border-light)] pt-4 flex justify-between items-center">
            <div class="space-y-1">
              <div class="skeleton-line h-3 w-24"></div>
              <div class="skeleton-line h-3 w-20"></div>
            </div>
            <div class="skeleton-line h-8 w-16"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- Row skeleton: table-row shaped placeholders matching task list rows -->
    <template v-else-if="type === 'row'">
      <div class="border-2 border-[var(--border-light)] bg-[var(--surface-elevated)]">
        <div
          v-for="i in count"
          :key="i"
          class="flex items-center gap-4 px-4 py-3 border-b-2 border-[var(--border-light)] last:border-b-0"
        >
          <div class="skeleton-line h-4 w-4 flex-shrink-0"></div>
          <div class="skeleton-line h-4 flex-1 max-w-[40%]"></div>
          <div class="skeleton-line h-5 w-20 flex-shrink-0"></div>
          <div class="skeleton-line h-5 w-16 flex-shrink-0"></div>
          <div class="skeleton-line h-4 w-24 flex-shrink-0 hidden sm:block"></div>
          <div class="skeleton-line h-4 w-20 flex-shrink-0 hidden md:block"></div>
        </div>
      </div>
    </template>

    <!-- Text skeleton: line placeholders for detail views -->
    <template v-else-if="type === 'text'">
      <div class="space-y-3">
        <div
          v-for="i in count"
          :key="i"
          class="skeleton-line h-3"
          :style="{ width: lineWidths[i - 1] }"
        ></div>
      </div>
    </template>

    <!-- Detail page skeleton -->
    <template v-else-if="type === 'detail'">
      <div class="mb-6">
        <div class="skeleton-line h-6 w-1/3 mb-2"></div>
        <div class="skeleton-line h-4 w-1/4"></div>
      </div>
      <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
        <div class="skeleton-line h-4 w-full mb-3"></div>
        <div class="skeleton-line h-4 w-5/6 mb-3"></div>
        <div class="skeleton-line h-4 w-4/6 mb-6"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="skeleton-line h-20 w-full"></div>
          <div class="skeleton-line h-20 w-full"></div>
        </div>
      </div>
    </template>

    <!-- Default: simple blocks -->
    <template v-else>
      <div
        v-for="i in count"
        :key="i"
        class="skeleton-line h-4 mb-2"
        :style="{ width: lineWidths[i - 1] }"
      ></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'card', 'row', 'text', 'detail'].includes(v)
  },
  count: {
    type: Number,
    default: 3
  },
  className: {
    type: String,
    default: ''
  }
})

// Deterministic widths for text lines so they don't shift on re-render
const lineWidths = computed(() => {
  const widths = ['100%', '88%', '72%', '95%', '80%', '65%', '90%', '75%', '85%', '70%']
  return Array.from({ length: props.count }, (_, i) => widths[i % widths.length])
})
</script>

<style scoped>
.skeleton-line {
  background: linear-gradient(
    90deg,
    var(--surface) 25%,
    var(--border-light) 50%,
    var(--surface) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border: 2px solid var(--border-light);
}

.skeleton-card {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
