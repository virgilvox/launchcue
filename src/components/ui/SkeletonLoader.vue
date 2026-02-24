<template>
  <div class="animate-pulse" :class="className">
    <!-- Card skeleton -->
    <template v-if="type === 'card'">
      <div v-for="i in count" :key="i" class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-4 sm:p-6 mb-4">
        <div class="h-4 bg-[var(--surface)] rounded w-3/4 mb-3"></div>
        <div class="h-3 bg-[var(--surface)] rounded w-full mb-2"></div>
        <div class="h-3 bg-[var(--surface)] rounded w-5/6"></div>
      </div>
    </template>

    <!-- Table row skeleton -->
    <template v-else-if="type === 'table'">
      <div v-for="i in count" :key="i" class="flex items-center space-x-4 py-3 border-b border-[var(--border-light)]">
        <div class="h-4 bg-[var(--surface)] rounded w-1/4"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-1/6"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-1/5"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-1/6"></div>
      </div>
    </template>

    <!-- Text line skeleton -->
    <template v-else-if="type === 'text'">
      <div v-for="i in count" :key="i" class="mb-2">
        <div class="h-3 bg-[var(--surface)] rounded" :style="{ width: `${60 + Math.random() * 40}%` }"></div>
      </div>
    </template>

    <!-- Detail page skeleton -->
    <template v-else-if="type === 'detail'">
      <div class="mb-6">
        <div class="h-6 bg-[var(--surface)] rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-1/4"></div>
      </div>
      <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
        <div class="h-4 bg-[var(--surface)] rounded w-full mb-3"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-5/6 mb-3"></div>
        <div class="h-4 bg-[var(--surface)] rounded w-4/6 mb-6"></div>
        <div class="grid grid-cols-2 gap-4">
          <div class="h-20 bg-[var(--surface)] rounded"></div>
          <div class="h-20 bg-[var(--surface)] rounded"></div>
        </div>
      </div>
    </template>

    <!-- Default: simple block -->
    <template v-else>
      <div v-for="i in count" :key="i" class="h-4 bg-[var(--surface)] rounded mb-2" :style="{ width: `${60 + Math.random() * 40}%` }"></div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'card', 'table', 'text', 'detail'].includes(v)
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
</script>
