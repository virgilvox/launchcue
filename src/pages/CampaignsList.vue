<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-[var(--text-primary)]">Campaigns</h2>
      <router-link to="/campaigns/new" class="btn btn-primary">New Campaign</router-link>
    </div>

    <!-- Filters -->
    <div class="card mb-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           <div>
                <label for="clientFilter" class="label text-xs">Filter by Client</label>
                <select id="clientFilter" v-model="filters.clientId" class="input text-sm">
                    <option :value="null">All Clients</option>
                    <option v-for="client in clients" :key="client.id" :value="client.id">
                        {{ client.name }}
                    </option>
                </select>
            </div>
            <div>
                <label for="projectFilter" class="label text-xs">Filter by Project</label>
                <select id="projectFilter" v-model="filters.projectId" class="input text-sm" :disabled="!filters.clientId">
                    <option :value="null">All Projects</option>
                    <option v-for="project in filteredProjects" :key="project.id" :value="project.id">
                        {{ project.title }}
                    </option>
                </select>
            </div>
            <div>
                <label for="statusFilter" class="label text-xs">Filter by Status</label>
                <select id="statusFilter" v-model="filters.status" class="input text-sm">
                    <option :value="null">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
        </div>
    </div>

    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading campaigns..." />
    </div>
    <div v-else-if="error" class="text-center py-10">
      <p class="text-[var(--danger)]">{{ error }}</p>
    </div>
    <div v-else-if="filteredCampaigns.length === 0" class="text-center py-10 bg-[var(--surface)]">
      <p class="text-[var(--text-secondary)]">No campaigns found matching your criteria.</p>
       <router-link to="/campaigns/new" v-if="!hasActiveFilters" class="btn btn-secondary mt-4">Create First Campaign</router-link>
       <button @click="clearFilters" v-if="hasActiveFilters" class="text-[var(--accent-primary)] hover:underline mt-2">
          Clear Filters
      </button>
    </div>

    <!-- Campaign List/Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link 
            v-for="campaign in filteredCampaigns" 
            :key="campaign.id"
            :to="`/campaigns/${campaign.id}`" 
            class="card group"
         >
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">{{ campaign.title }}</h3>
                <span :class="statusBadgeClass(campaign.status)">{{ campaign.status || 'draft' }}</span>
            </div>
            <p class="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{{ campaign.description }}</p>
            <div class="text-xs text-[var(--text-secondary)]">
                 <span v-if="campaign.clientId" class="inline-flex items-center gap-1"><ClientColorDot :color="getClientColorId(campaign.clientId)" /> Client: {{ getClientName(campaign.clientId) }}</span>
                 <span v-if="campaign.clientId && campaign.projectId"> • </span>
                 <span v-if="campaign.projectId">Project: {{ getProjectName(campaign.projectId) }}</span>
             </div>
            <div v-if="campaign.budget != null" class="mt-2 text-sm font-medium text-[var(--text-primary)]">
                Budget: ${{ campaign.budget.toLocaleString() }}
            </div>
            <div class="mt-3 pt-3 border-t border-[var(--border-light)] text-xs text-[var(--text-secondary)]">
                Dates: {{ formatShortDate(campaign.startDate) || 'N/A' }} - {{ formatShortDate(campaign.endDate) || 'N/A' }}
            </div>
             <div v-if="campaign.types && campaign.types.length > 0" class="mt-2 flex flex-wrap gap-1">
                 <span v-for="type in campaign.types" :key="type" class="tag">{{ type }}</span>
            </div>
        </router-link>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import campaignService from '../services/campaign.service';
import { useClientStore } from '../stores/client';
import { useProjectStore } from '../stores/project';
import { useToast } from 'vue-toastification';
import { formatShortDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ClientColorDot from '../components/ui/ClientColorDot.vue';

const clientStore = useClientStore();
const projectStore = useProjectStore();
const toast = useToast();
const { getClientName, getProjectName, getClientColorId } = useEntityLookup();

const campaigns = ref([]);
const loading = ref(false);
const error = ref(null);
const filters = ref({
    clientId: null,
    projectId: null,
    status: null,
});

const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);

const filteredProjects = computed(() => {
    if (!filters.value.clientId) return projects.value;
    return projects.value.filter(p => p.clientId === filters.value.clientId);
});

const filteredCampaigns = computed(() => {
    // No local filtering needed now as we fetch filtered data
    return campaigns.value;
});

const hasActiveFilters = computed(() => filters.value.clientId || filters.value.projectId || filters.value.status);

async function loadInitialData() {
    loading.value = true;
    error.value = null;
    try {
        const results = await Promise.allSettled([
            clientStore.fetchClients(),
            projectStore.fetchProjects(),
            fetchCampaigns()
        ]);
        results.forEach((result, i) => {
            if (result.status === 'rejected') {
                console.error(`Fetch #${i} failed:`, result.reason);
            }
        });
    } catch (err) {
        console.error("Error loading initial data for campaigns list:", err);
        error.value = "Failed to load necessary data.";
        toast.error(error.value);
    } finally {
        loading.value = false;
    }
}

async function fetchCampaigns() {
    loading.value = true; // Indicate loading when filters change
    try {
        const queryParams = {};
        if (filters.value.clientId) queryParams.clientId = filters.value.clientId;
        if (filters.value.projectId) queryParams.projectId = filters.value.projectId;
        if (filters.value.status) queryParams.status = filters.value.status;
        campaigns.value = await campaignService.getCampaigns(queryParams);
    } catch (err) {
        console.error("Error fetching campaigns:", err);
        error.value = "Failed to load campaigns.";
        toast.error(error.value);
    } finally {
        loading.value = false;
    }
}

// Watch filters to refetch campaigns
watch(filters, fetchCampaigns, { deep: true });

// Watch client filter to reset project filter
watch(() => filters.value.clientId, () => {
    filters.value.projectId = null;
});

function clearFilters() {
    filters.value = { clientId: null, projectId: null, status: null };
}

function statusBadgeClass(status) {
    const base = 'inline-block px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap border-2';
    switch (status) {
        case 'active': return `${base} bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20`;
        case 'paused': return `${base} bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20`;
        case 'completed': return `${base} bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20`;
        default: return `${base} bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-light)]`;
    }
}

onMounted(() => {
    loadInitialData();
});
</script>

<style scoped>
.tag {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border: 2px solid var(--border-light);
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: 'JetBrains Mono', monospace;
}
</style> 