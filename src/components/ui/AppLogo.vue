<template>
  <span class="inline-flex items-center" :class="{ 'gap-2': showText }">
    <img
      src="/logo-placeholder.png"
      alt="LaunchCue"
      :width="size"
      :height="size"
      class="object-contain flex-shrink-0"
    />
    <span v-if="showText" class="font-heading font-bold" :class="textClass">LaunchCue</span>
  </span>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 32,
  },
  showText: {
    type: Boolean,
    default: false,
  },
  textClass: {
    type: String,
    default: 'text-lg',
  },
});
</script>
