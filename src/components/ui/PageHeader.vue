<template>
  <div class="mb-6">
    <!-- Breadcrumbs -->
    <nav v-if="breadcrumbs?.length" class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <router-link
          v-if="crumb.to"
          :to="crumb.to"
          class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {{ crumb.label }}
        </router-link>
        <span v-else>{{ crumb.label }}</span>
        <span v-if="i < breadcrumbs.length - 1" class="text-gray-400 dark:text-gray-500">/</span>
      </template>
    </nav>

    <!-- Header row -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Back button -->
        <router-link
          v-if="backTo"
          :to="backTo"
          class="btn-icon flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Go back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </router-link>

        <div class="min-w-0">
          <h1 class="heading-page truncate">{{ title }}</h1>
          <p v-if="subtitle" class="text-caption mt-1">{{ subtitle }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2 flex-shrink-0">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  backTo: {
    type: [String, Object],
    default: null
  },
  breadcrumbs: {
    type: Array,
    default: null
  }
});
</script>
