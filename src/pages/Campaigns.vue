<template>
  <PageContainer>
    <div class="flex flex-col h-full">
      <header class="mb-6 flex justify-between items-center">
        <h2 class="heading-page">Campaign Builder</h2>
        <button
          v-if="authStore.canEdit"
          @click="saveCampaign"
          class="btn btn-primary"
          :disabled="savingCampaign"
        >
          {{ savingCampaign ? 'Saving...' : (campaign.id ? 'Save Changes' : 'Save Campaign') }}
        </button>
      </header>

      <div class="flex space-x-6">
        <!-- Main Content -->
        <div class="flex-1">
          <CampaignForm
            :campaign="campaign"
            :clients="clients"
            :filtered-projects="filteredProjects"
            :campaign-types="campaignTypes"
            @update:title="campaign.title = $event"
            @update:client-id="onClientIdChange"
            @update:project-id="campaign.projectId = $event"
            @update:status="campaign.status = $event"
            @update:budget="campaign.budget = $event"
            @update:description="campaign.description = $event"
            @update:metric="onMetricUpdate"
            @toggle-type="toggleCampaignType"
          />

          <!-- Timeline -->
          <CampaignTimeline
            v-model="campaign.steps"
            :team-members="teamMembers"
          />

          <!-- Generate Recap Button -->
          <div class="mt-8 flex justify-end">
            <button
              @click="generateRecap"
              class="btn btn-primary"
            >
              Generate Recap
            </button>
          </div>
        </div>

        <!-- Sidebar -->
        <CampaignCard
          :attachments="attachments"
          :team-members="teamMembers"
          @image-error="handleImageError"
        />
      </div>

      <!-- Generate Recap Modal -->
      <Modal v-model="showRecapModal" :title="`Recap: ${campaign.title || 'Campaign'}`">
        <div class="prose prose-sm max-w-none mb-4">
          <p v-if="campaign.description">{{ campaign.description }}</p>
          <p><strong>Timeline:</strong> {{ formatShortDate(campaign.startDate) || 'N/A' }} - {{ formatShortDate(campaign.endDate) || 'N/A' }}</p>
          <p v-if="campaignTypes.filter(t => t.active).length > 0">
            <strong>Types:</strong> {{ campaignTypes.filter(t => t.active).map(t => t.name).join(', ') }}
          </p>
          <div v-if="getClientName(campaign.clientId)">
            <strong>Client:</strong> {{ getClientName(campaign.clientId) }}
            <span v-if="getProjectName(campaign.projectId)"> &bull; Project: {{ getProjectName(campaign.projectId) }}</span>
          </div>

          <h4 v-if="teamMembers.length > 0">Team Members:</h4>
          <ul v-if="teamMembers.length > 0">
            <li v-for="member in teamMembers" :key="member.id">{{ member.name }}</li>
          </ul>

          <h4 v-if="campaign.steps && campaign.steps.length > 0">Timeline Steps:</h4>
          <ul v-if="campaign.steps && campaign.steps.length > 0">
            <li v-for="step in sortedCampaignSteps" :key="step.id">
              <strong>{{ formatShortDate(step.date) || 'Date TBD' }}:</strong> {{ step.title }}
              <span v-if="step.assigneeId"> ({{ getAssigneeName(step.assigneeId) }})</span>
              <p v-if="step.description" class="text-xs pl-4 text-[var(--text-secondary)]">{{ step.description }}</p>
            </li>
          </ul>

          <h4 v-if="attachments.length > 0">Attachments:</h4>
          <ul v-if="attachments.length > 0">
            <li v-for="(attachment, index) in attachments" :key="index">{{ attachment }}</li>
          </ul>
        </div>

        <div class="flex justify-end space-x-3">
          <button @click="showRecapModal = false" class="btn btn-secondary">Close</button>
          <button @click="exportRecap" class="btn btn-primary">Export</button>
        </div>
      </Modal>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import campaignService from '@/services/campaign.service';
import teamService from '@/services/team.service';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import { useRoute, useRouter } from 'vue-router';
import { formatShortDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';
import CampaignTimeline from '@/components/campaigns/CampaignTimeline.vue';
import Modal from '@/components/Modal.vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import CampaignForm from '@/components/campaign/CampaignForm.vue';
import CampaignCard from '@/components/campaign/CampaignCard.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const authStore = useAuthStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();
const { getClientName, getProjectName } = useEntityLookup();
const route = useRoute();
const router = useRouter();
const loading = ref(false);
const error = ref(null);
const loadingTeam = ref(false);
const loadingCampaigns = ref(false);
const loadingClients = ref(false);
const loadingProjects = ref(false);

// Campaign data
const campaign = ref({
  id: null,
  title: '',
  description: '',
  startDate: null,
  endDate: null,
  clientId: null,
  projectId: null,
  types: [],
  steps: [],
  status: 'draft',
  budget: null,
  metrics: { reach: undefined, engagement: undefined, conversions: undefined },
});

// Campaign types with toggle functionality
const campaignTypes = ref([
  { name: 'Docs', color: 'blue', active: false },
  { name: 'Blog', color: 'purple', active: false },
  { name: 'Discord', color: 'indigo', active: false },
  { name: 'Social', color: 'green', active: false }
]);

// Timeline events
const timelineEvents = ref([]);

// Attachments
const attachments = ref([]);

// Team members
const teamMembers = ref([]);

// Recap modal
const showRecapModal = ref(false);
const savingCampaign = ref(false);

// Data for selectors
const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);

// Filter projects based on selected client
const filteredProjects = computed(() => {
  if (!campaign.value.clientId) return [];
  return projects.value.filter(p => p.clientId === campaign.value.clientId);
});

// Watch clientId to reset projectId if client changes
watch(() => campaign.value.clientId, () => {
  campaign.value.projectId = null;
});

// --- Event handlers from child components ---

function onClientIdChange(value) {
  campaign.value.clientId = value;
}

function onMetricUpdate(key, value) {
  if (!campaign.value.metrics) {
    campaign.value.metrics = { reach: undefined, engagement: undefined, conversions: undefined };
  }
  campaign.value.metrics[key] = value;
}

function toggleCampaignType(type) {
  type.active = !type.active;
}

// Handle image error from CampaignCard
function handleImageError(event, member) {
  if (event.target) {
    event.target.removeEventListener('error', handleImageError);
    event.target.style.display = 'none';
  }
  member.avatar = null;
}

// --- Data loading ---

async function loadCampaign(id) {
  if (!id) return;

  loadingCampaigns.value = true;
  error.value = null;

  try {
    const campaignData = await campaignService.getCampaign(id);
    campaign.value = {
      ...campaignData,
      id: campaignData._id?.toString() || campaignData.id,
      startDate: campaignData.startDate ? new Date(campaignData.startDate).toISOString().split('T')[0] : null,
      endDate: campaignData.endDate ? new Date(campaignData.endDate).toISOString().split('T')[0] : null,
      steps: campaignData.steps || [],
      status: campaignData.status || 'draft',
      budget: campaignData.budget ?? null,
      metrics: campaignData.metrics || { reach: undefined, engagement: undefined, conversions: undefined },
    };
    campaignTypes.value.forEach(type => {
      type.active = campaignData.types?.includes(type.name) || false;
    });

    // Load campaign steps/events
    loadTimelineEvents(id);

    // Set active campaign types
    if (campaignData.types && Array.isArray(campaignData.types)) {
      campaignTypes.value.forEach(type => {
        type.active = campaignData.types.includes(type.name);
      });
    }

    // Load attachments if they exist
    if (campaignData.attachments && Array.isArray(campaignData.attachments)) {
      attachments.value = campaignData.attachments;
    }

  } catch (err) {
    error.value = 'Failed to load campaign. Please try again.';
  } finally {
    loadingCampaigns.value = false;
  }
}

async function loadTimelineEvents(campaignId) {
  if (!campaignId) return;

  try {
    timelineEvents.value = await campaignService.getCampaignSteps(campaignId);
  } catch (err) {
    toast.error('Failed to load timeline events. Please try again.');
  }
}

async function loadTeamMembers() {
  if (!authStore.currentTeam?.id) return;

  loadingTeam.value = true;

  try {
    const result = await teamService.getTeamMembers(authStore.currentTeam.id);
    if (result.success) {
      teamMembers.value = result.members.map(member => ({
        id: member.id,
        userId: member.id,
        name: member.displayName || member.email || 'Unknown User',
        email: member.email,
        avatar: member.photoURL || null
      }));
    } else {
      teamMembers.value = [];
    }
  } catch (err) {
    toast.error('Failed to load team members. Please try again.');
    teamMembers.value = [];
  } finally {
    loadingTeam.value = false;
  }
}

async function loadClientsAndProjects() {
  loadingClients.value = true;
  loadingProjects.value = true;
  try {
    const results = await Promise.allSettled([
      clientStore.fetchClients(),
      projectStore.fetchProjects()
    ]);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        toast.error('Failed to load clients or projects. Please try again.');
      }
    });
  } catch (err) {
    toast.error('Failed to load clients or projects. Please try again.');
  } finally {
    loadingClients.value = false;
    loadingProjects.value = false;
  }
}

// --- Actions ---

async function saveCampaign() {
  if (!campaign.value.title) {
    toast.warning("Campaign title is required.");
    return;
  }

  savingCampaign.value = true;
  error.value = null;

  try {
    const campaignDataToSave = {
      title: campaign.value.title,
      description: campaign.value.description,
      startDate: campaign.value.startDate || null,
      endDate: campaign.value.endDate || null,
      clientId: campaign.value.clientId || null,
      projectId: campaign.value.projectId || null,
      types: campaignTypes.value.filter(t => t.active).map(t => t.name),
      steps: campaign.value.steps,
      status: campaign.value.status || 'draft',
      budget: campaign.value.budget ?? null,
      metrics: campaign.value.metrics || undefined,
    };

    let savedCampaign;
    if (campaign.value.id) {
      savedCampaign = await campaignService.updateCampaign(campaign.value.id, campaignDataToSave);
      toast.success('Campaign updated successfully!');
    } else {
      savedCampaign = await campaignService.createCampaign(campaignDataToSave);
      toast.success('Campaign created successfully!');
      campaign.value.id = savedCampaign.id;
      router.replace(`/campaigns/${savedCampaign.id}`);
    }

  } catch (err) {
    error.value = 'Failed to save campaign. Please try again.';
    toast.error(error.value);
  } finally {
    savingCampaign.value = false;
  }
}

function generateRecap() {
  showRecapModal.value = true;
}

async function exportRecap() {
  if (!campaign.value.id) return;

  try {
    const result = await campaignService.exportCampaign(campaign.value.id, 'markdown');
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }

    showRecapModal.value = false;
  } catch (err) {
    error.value = 'Failed to export recap. Please try again.';
  }
}

// --- Helpers for recap modal ---

const sortedCampaignSteps = computed(() => {
  if (!campaign.value?.steps) return [];
  return [...campaign.value.steps].sort((a, b) => new Date(a.date) - new Date(b.date));
});

const getAssigneeName = (userId) => {
  const member = teamMembers.value.find(m => m.userId === userId);
  return member ? member.name : 'Unassigned';
};

// --- Initialization ---

onMounted(async () => {
  const campaignId = route.params.id;
  loading.value = true;

  try {
    const initResults = await Promise.allSettled([
      loadTeamMembers(),
      loadClientsAndProjects()
    ]);
    initResults.forEach((result, i) => {
      if (result.status === 'rejected') {
        toast.error('Failed to initialize campaign data. Please try again.');
      }
    });

    if (campaignId) {
      await loadCampaign(campaignId);
    } else {
      campaign.value = {
        id: null, title: '', description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        clientId: null, projectId: null, types: [], steps: [],
        status: 'draft', budget: null,
        metrics: { reach: undefined, engagement: undefined, conversions: undefined },
      };
      campaignTypes.value.forEach(type => type.active = false);
      timelineEvents.value = [];
      attachments.value = [];
    }
  } catch (err) {
    error.value = 'Failed to initialize campaign page. Please try again.';
  } finally {
    loading.value = false;
  }
});
</script>
