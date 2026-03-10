<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  totalPages: number
  total: number
  limit: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const showingFrom = computed(() => (props.page - 1) * props.limit + 1)
const showingTo = computed(() => Math.min(props.page * props.limit, props.total))

const pages = computed(() => {
  const result: (number | '...')[] = []
  const { page, totalPages } = props

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) result.push(i)
    return result
  }

  result.push(1)
  if (page > 3) result.push('...')

  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)
  for (let i = start; i <= end; i++) result.push(i)

  if (page < totalPages - 2) result.push('...')
  result.push(totalPages)

  return result
})
</script>

<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between pt-4 border-t-2 border-[var(--border)]">
    <span class="text-body-sm text-[var(--text-secondary)]">
      Showing {{ showingFrom }}–{{ showingTo }} of {{ total }}
    </span>

    <div class="flex items-center gap-1">
      <button
        class="btn btn-ghost px-2 py-1 text-sm"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        Prev
      </button>

      <template v-for="p in pages" :key="p">
        <span v-if="p === '...'" class="px-2 text-[var(--text-secondary)]">…</span>
        <button
          v-else
          class="px-3 py-1 text-sm border-2 transition-colors"
          :class="p === page
            ? 'bg-[var(--accent-primary)] text-white border-[var(--border)]'
            : 'bg-transparent text-[var(--text-primary)] border-transparent hover:border-[var(--border)]'"
          @click="emit('update:page', p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="btn btn-ghost px-2 py-1 text-sm"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>
