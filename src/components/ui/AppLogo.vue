<template>
  <span class="inline-flex items-center" :class="{ 'gap-2': showText }">
    <svg
      :width="size"
      :height="size"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#7c5cfc" />
          <stop offset="100%" stop-color="#4f46e5" />
        </linearGradient>
      </defs>
      <path
        d="M16 2c-1.5 0-3 1.2-4.5 4-1.2 2.3-2 5.2-2.5 8.5-.3 2-.4 4-.4 5.5 0 2 .3 3.5.9 4.5.8 1.3 2 2 3.5 2.3L12 30l4-2 4 2-1-3.2c1.5-.3 2.7-1 3.5-2.3.6-1 .9-2.5.9-4.5 0-1.5-.1-3.5-.4-5.5-.5-3.3-1.3-6.2-2.5-8.5C19 3.2 17.5 2 16 2zm-2 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
        :fill="`url(#${gradientId})`"
      />
    </svg>
    <span v-if="showText" class="font-heading font-bold" :class="textClass">LaunchCue</span>
  </span>
</template>

<script setup>
let nextId = 0;

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

const gradientId = `logo-grad-${nextId++}`;
</script>
