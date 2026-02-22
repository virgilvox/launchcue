<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Campaigns</h2>
      <router-link to="/campaigns/new" class="btn btn-primary">New Campaign</router-link>
    </div>

    <!-- Filters -->
    <div class="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
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
             <!-- Add status or type filters if needed -->
        </div>
    </div>

    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading campaigns..." />
    </div>
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500">{{ error }}</p>
    </div>
    <div v-else-if="filteredCampaigns.length === 0" class="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-gray-500 dark:text-gray-400">No campaigns found matching your criteria.</p>
       <router-link to="/campaigns/new" v-if="!hasActiveFilters" class="btn btn-secondary mt-4">Create First Campaign</router-link>
       <button @click="clearFilters" v-if="hasActiveFilters" class="text-primary-600 dark:text-primary-400 hover:underline mt-2">
          Clear Filters
      </button>
    </div>

    <!-- Campaign List/Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <router-link 
            v-for="campaign in filteredCampaigns" 
            :key="campaign.id"
            :to="`/campaigns/${campaign.id}`" 
            class="card hover:shadow-lg transition-shadow group"
         >
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 mb-2">{{ campaign.title }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{{ campaign.description }}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400">
                 <span v-if="campaign.clientId">Client: {{ getClientName(campaign.clientId) }}</span>
                 <span v-if="campaign.clientId && campaign.projectId"> • </span>
                 <span v-if="campaign.projectId">Project: {{ getProjectName(campaign.projectId) }}</span>
             </div>
            <div class="mt-3 pt-3 border-t dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                Dates: {{ formatDate(campaign.startDate) || 'N/A' }} - {{ formatDate(campaign.endDate) || 'N/A' }}
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
import LoadingSpinner from '../components/LoadingSpinner.vue';

const clientStore = useClientStore();
const projectStore = useProjectStore();
const toast = useToast();

const campaigns = ref([]);
const loading = ref(false);
const error = ref(null);
const filters = ref({
    clientId: null,
    projectId: null
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

const hasActiveFilters = computed(() => filters.value.clientId || filters.value.projectId);

async function loadInitialData() {
    loading.value = true;
    error.value = null;
    try {
        await Promise.all([
            clientStore.fetchClients(),
            projectStore.fetchProjects(),
            fetchCampaigns() // Initial fetch without filters
        ]);
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
    filters.value = { clientId: null, projectId: null };
}

function getClientName(clientId) {
    const client = clients.value.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
}

function getProjectName(projectId) {
    const project = projects.value.find(p => p.id === projectId);
    return project ? project.title : 'Unknown';
}

function formatDate(dateString) {
    if (!dateString) return null;
    try {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric'});
    } catch { return null; }
}

onMounted(() => {
    loadInitialData();
});
</script>

<style scoped>
.tag {
    @apply inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs;
}
</style> 