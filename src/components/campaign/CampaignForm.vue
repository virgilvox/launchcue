<template>
  <div>
    <!-- Campaign Details -->
    <div class="mb-6">
      <h3 class="uppercase text-xs font-semibold text-[var(--text-secondary)] tracking-wider mb-3">Campaign Details</h3>
      <div class="card p-4 space-y-4">
        <input
          :value="campaign.title"
          @input="emitTitle"
          class="w-full bg-transparent text-xl font-semibold text-[var(--text-primary)] border-none p-1"
          placeholder="Campaign Title"
          required
        />
        <!-- Client Selector -->
        <div>
          <label for="campaignClient" class="label text-xs">Client (Optional)</label>
          <select
            id="campaignClient"
            :value="campaign.clientId"
            @change="emitClientId"
            class="input input-sm text-sm"
          >
            <option :value="null">-- Select Client --</option>
            <option v-for="client in clients" :key="client.id" :value="client.id">
              {{ client.name }}
            </option>
          </select>
        </div>
        <!-- Project Selector -->
        <div v-if="campaign.clientId">
          <label for="campaignProject" class="label text-xs">Project (Optional)</label>
          <select
            id="campaignProject"
            :value="campaign.projectId"
            @change="emitProjectId"
            class="input input-sm text-sm"
            :disabled="!campaign.clientId"
          >
            <option :value="null">-- Select Project --</option>
            <option v-for="project in filteredProjects" :key="project.id" :value="project.id">
              {{ project.title }}
            </option>
          </select>
        </div>
        <!-- Status Selector -->
        <div>
          <label for="campaignStatus" class="label text-xs">Status</label>
          <select
            id="campaignStatus"
            :value="campaign.status"
            @change="emitStatus"
            class="input input-sm text-sm"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <!-- Budget Input -->
        <div>
          <label for="campaignBudget" class="label text-xs">Budget (Optional)</label>
          <input
            id="campaignBudget"
            type="number"
            :value="campaign.budget"
            @input="emitBudget"
            class="input input-sm text-sm"
            placeholder="Enter budget amount"
            min="0"
            step="0.01"
          />
        </div>
        <!-- Metrics Fields (visible when active or completed) -->
        <div v-if="campaign.status === 'active' || campaign.status === 'completed'" class="space-y-3 pt-2 border-t border-[var(--border-light)]">
          <h4 class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Metrics</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label for="metricReach" class="label text-xs">Reach</label>
              <input
                id="metricReach"
                type="number"
                :value="campaign.metrics?.reach"
                @input="emitMetric('reach', $event)"
                class="input input-sm text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label for="metricEngagement" class="label text-xs">Engagement</label>
              <input
                id="metricEngagement"
                type="number"
                :value="campaign.metrics?.engagement"
                @input="emitMetric('engagement', $event)"
                class="input input-sm text-sm"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label for="metricConversions" class="label text-xs">Conversions</label>
              <input
                id="metricConversions"
                type="number"
                :value="campaign.metrics?.conversions"
                @input="emitMetric('conversions', $event)"
                class="input input-sm text-sm"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Campaign Tags/Types -->
    <div class="flex mb-6 space-x-2">
      <button
        v-for="type in campaignTypes"
        :key="type.name"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors border-2',
          type.active
            ? `bg-${type.color}-600 text-white border-${type.color}-600`
            : 'bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent-primary)]'
        ]"
        @click="emit('toggle-type', type)"
      >
        {{ type.name }}
      </button>
    </div>

    <!-- Campaign Description -->
    <div class="mb-6">
      <h3 class="uppercase text-xs font-semibold text-[var(--text-secondary)] tracking-wider mb-3">Timeline</h3>
      <div class="card p-4 mb-6">
        <textarea
          :value="campaign.description"
          @input="emitDescription"
          class="w-full bg-transparent text-[var(--text-primary)] border-none resize-none"
          rows="2"
          placeholder="Enter campaign description..."
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CampaignMetrics {
  reach?: number
  engagement?: number
  conversions?: number
}

interface CampaignData {
  id: string | null
  title: string
  description: string
  startDate: string | null
  endDate: string | null
  clientId: string | null
  projectId: string | null
  types: string[]
  steps: unknown[]
  status: string
  budget: number | null
  metrics: CampaignMetrics
}

interface Client {
  id: string
  name: string
}

interface Project {
  id: string
  title: string
  clientId: string
}

interface CampaignType {
  name: string
  color: string
  active: boolean
}

defineProps<{
  campaign: CampaignData
  clients: Client[]
  filteredProjects: Project[]
  campaignTypes: CampaignType[]
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:clientId': [value: string | null]
  'update:projectId': [value: string | null]
  'update:status': [value: string]
  'update:budget': [value: number | null]
  'update:description': [value: string]
  'update:metric': [key: string, value: number]
  'toggle-type': [type: CampaignType]
}>()

function emitTitle(event: Event) {
  emit('update:title', (event.target as HTMLInputElement).value)
}

function emitClientId(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:clientId', value || null)
}

function emitProjectId(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('update:projectId', value || null)
}

function emitStatus(event: Event) {
  emit('update:status', (event.target as HTMLSelectElement).value)
}

function emitBudget(event: Event) {
  const num = (event.target as HTMLInputElement).valueAsNumber
  emit('update:budget', isNaN(num) ? null : num)
}

function emitDescription(event: Event) {
  emit('update:description', (event.target as HTMLTextAreaElement).value)
}

function emitMetric(key: string, event: Event) {
  const num = (event.target as HTMLInputElement).valueAsNumber
  emit('update:metric', key, isNaN(num) ? 0 : num)
}
</script>
