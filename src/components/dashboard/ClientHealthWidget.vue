<template>
  <div class="card">
    <div class="flex justify-between items-center mb-4">
      <h3 class="heading-card">Client Health</h3>
      <router-link to="/clients" class="btn btn-ghost btn-sm">VIEW ALL</router-link>
    </div>

    <div v-if="!clients.length" class="text-center py-6">
      <p class="text-caption">No clients yet</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="client in topClients"
        :key="client.id"
        class="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0"
        :style="{ borderLeftWidth: '3px', borderLeftColor: getClientColor(client.color), paddingLeft: '0.75rem' }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            :class="['w-2.5 h-2.5 flex-shrink-0', getHealthDot(client)]"
          ></div>
          <router-link
            :to="`/clients/${client.id}`"
            class="text-body-sm font-medium truncate hover:text-[var(--accent-primary)]"
          >
            {{ client.name }}
          </router-link>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="mono text-body-sm text-[var(--text-secondary)]">
            {{ getClientTaskCount(client.id) }} tasks
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getClientColor } from '@/constants/clientColors'

const props = defineProps({
  clients: { type: Array, default: () => [] },
  tasks: { type: Array, default: () => [] },
})

const topClients = computed(() => props.clients.slice(0, 5))

function getClientTaskCount(clientId) {
  // Count tasks linked through projects
  return props.tasks.filter(t => t.clientId === clientId).length
}

function getHealthDot(client) {
  const tasks = props.tasks.filter(t => t.clientId === client.id)
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === 'Done') return false
    return new Date(t.dueDate) < new Date()
  })
  const blocked = tasks.filter(t => t.status === 'Blocked')

  if (overdue.length > 0) return 'bg-[var(--danger)]'
  if (blocked.length > 0) return 'bg-[var(--warning)]'
  return 'bg-[var(--success)]'
}
</script>
