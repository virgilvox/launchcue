<template>
  <div>
    <label class="label">CLIENT COLOR</label>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="color in CLIENT_COLORS"
        :key="color.id"
        type="button"
        class="w-8 h-8 border-2 transition-shadow"
        :class="modelValue === color.id ? 'border-[var(--border)] shadow-[3px_3px_0_0_var(--shadow-color)]' : 'border-[var(--border-light)]'"
        :style="{ backgroundColor: color.hex }"
        :title="color.label"
        @click="$emit('update:modelValue', color.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CLIENT_COLORS } from '@/constants/clientColors'

defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
