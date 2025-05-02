<template>
  <div class="flex flex-col h-full">
    <header class="mb-6 flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Campaign Builder</h2>
      <button 
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
        <!-- Campaign Details -->
        <div class="mb-6">
          <h3 class="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider mb-3">Campaign Details</h3>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-4">
            <input 
              v-model="campaign.title" 
              class="w-full bg-transparent text-xl font-semibold text-gray-900 dark:text-white border-none focus:ring-0 p-1" 
              placeholder="Campaign Title"
              required
            />
             <!-- Client Selector -->
             <div>
                <label for="campaignClient" class="label text-xs">Client (Optional)</label>
                <select 
                  id="campaignClient"
                  v-model="campaign.clientId"
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
                  v-model="campaign.projectId"
                  class="input input-sm text-sm"
                  :disabled="!campaign.clientId" 
                >
                  <option :value="null">-- Select Project --</option>
                  <option v-for="project in filteredProjects" :key="project.id" :value="project.id">
                    {{ project.title }}
                  </option>
                </select>
             </div>
          </div>
        </div>
        
        <!-- Campaign Tags/Types -->
        <div class="flex mb-6 space-x-2">
          <button 
            v-for="type in campaignTypes" 
            :key="type.name"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              type.active 
                ? `bg-${type.color}-600 text-white` 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500' /* Darker inactive bg/text */
            ]"
            @click="toggleCampaignType(type)"
          >
            {{ type.name }}
          </button>
        </div>
        
        <!-- Campaign Description -->
        <div class="mb-6">
          <h3 class="uppercase text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wider mb-3">Timeline</h3>
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
            <textarea 
              v-model="campaign.description" 
              class="w-full bg-transparent text-gray-800 dark:text-gray-200 border-none focus:ring-0 resize-none" 
              rows="2"
              placeholder="Enter campaign description..."
            ></textarea>
          </div>
        </div>
        
        <!-- Timeline -->
        <CampaignTimeline 
            v-model="campaign.steps" 
            :team-members="teamMembers" 
        />
        
        <!-- Generate Recap Button -->
        <div class="mt-8 flex justify-end">
          <button 
            @click="generateRecap"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium"
          >
            Generate Recap
          </button>
        </div>
      </div>
      
      <!-- Sidebar -->
      <div class="w-80">
        <!-- Attachments -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 mb-6">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Attachments</h3>
          
          <div class="space-y-3">
            <div v-for="(attachment, index) in attachments" :key="index" class="flex items-center">
              <svg class="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <a href="#" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">{{ attachment }}</a>
            </div>
            
            <!-- Add Attachment Button -->
            <div class="flex items-center text-primary-600 dark:text-primary-400 cursor-pointer mt-2">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span class="text-sm">Add</span>
            </div>
          </div>
        </div>
        
        <!-- Team -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
          <h3 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Team</h3>
          
          <div class="flex justify-between items-center mb-4">
            <!-- Team members avatars -->
            <div class="flex -space-x-2">
              <div v-for="member in teamMembers" :key="member.id" class="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-800">
                <div v-if="member.avatar" class="w-full h-full">
                  <img :src="member.avatar" :alt="member.name" 
                       class="w-full h-full object-cover"
                       @error="handleImageError($event, member)" />
                </div>
                <div v-else class="w-full h-full bg-primary-500 text-white flex items-center justify-center">
                  {{ getInitials(member.name) }}
                </div>
              </div>
            </div>
            
            <!-- Member names in a simplified format -->
            <div class="flex flex-col items-end">
              <div v-for="member in teamMembers" :key="member.id" class="text-sm text-gray-700 dark:text-gray-300">
                {{ member.name }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Generate Recap Modal -->
    <Modal v-model="showRecapModal" :title="`Recap: ${campaign.title || 'Campaign'}`">
        <div class="prose prose-sm dark:prose-invert max-w-none mb-4">
            <p v-if="campaign.description">{{ campaign.description }}</p>
            <p><strong>Timeline:</strong> {{ formatDate(campaign.startDate) || 'N/A' }} - {{ formatDate(campaign.endDate) || 'N/A' }}</p>
            <p v-if="campaignTypes.filter(t => t.active).length > 0">
                <strong>Types:</strong> {{ campaignTypes.filter(t => t.active).map(t => t.name).join(', ') }}
            </p>
            <div v-if="getClientName(campaign.clientId)">
                <strong>Client:</strong> {{ getClientName(campaign.clientId) }}
                <span v-if="getProjectName(campaign.projectId)"> • Project: {{ getProjectName(campaign.projectId) }}</span>
            </div>
          
            <h4 v-if="teamMembers.length > 0">Team Members:</h4>
            <ul v-if="teamMembers.length > 0">
                <li v-for="member in teamMembers" :key="member.id">{{ member.name }}</li>
            </ul>
          
            <h4 v-if="campaign.steps && campaign.steps.length > 0">Timeline Steps:</h4>
            <ul v-if="campaign.steps && campaign.steps.length > 0">
                <li v-for="step in sortedCampaignSteps" :key="step.id">
                <strong>{{ formatSimpleDate(step.date) || 'Date TBD' }}:</strong> {{ step.title }}
                <span v-if="step.assigneeId"> ({{ getAssigneeName(step.assigneeId) }})</span>
                <p v-if="step.description" class="text-xs pl-4 text-gray-600 dark:text-gray-400">{{ step.description }}</p>
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
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import campaignService from '@/services/campaign.service';
import teamService from '@/services/team.service';
import { useClientStore } from '../stores/client';
import { useProjectStore } from '../stores/project';
import { useRoute, useRouter } from 'vue-router';
import CampaignTimeline from '../components/campaigns/CampaignTimeline.vue';
import Modal from '../components/Modal.vue';

const authStore = useAuthStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();
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
  steps: []
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
watch(() => campaign.value.clientId, (newClientId) => {
    campaign.value.projectId = null;
    // Optionally load only specific client's projects if needed, but stores handle all for now
});

function toggleCampaignType(type) {
  type.active = !type.active;
}

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
      steps: campaignData.steps || []
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
    console.error('Error loading campaign:', err);
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
    console.error('Error loading timeline events:', err);
    // Not setting main error since this is a secondary load
  }
}

async function loadTeamMembers() {
  if (!authStore.currentTeam?.id) return;
  
  loadingTeam.value = true;
  
  try {
    const result = await teamService.getTeamMembers(authStore.currentTeam.id);
    if (result.success) {
      // Ensure team members are properly formatted
      teamMembers.value = result.members.map(member => ({
        id: member.id,
        userId: member.id, // Add userId for CampaignTimeline component
        name: member.displayName || member.email || 'Unknown User',
        email: member.email,
        avatar: member.photoURL || null
      }));
    } else {
      console.error('Failed to load team members:', result.error);
      teamMembers.value = []; // Ensure it's an array even on error
    }
  } catch (err) {
    console.error('Error loading team members:', err);
    teamMembers.value = []; // Ensure it's an array even on error
  } finally {
    loadingTeam.value = false;
  }
}

async function loadClientsAndProjects() {
    loadingClients.value = true;
    loadingProjects.value = true;
    try {
        await Promise.all([
            clientStore.fetchClients(),
            projectStore.fetchProjects()
        ]);
    } catch (err) {
        console.error("Error loading clients/projects for campaign builder", err);
        // Handle error (e.g., show toast)
    } finally {
        loadingClients.value = false;
        loadingProjects.value = false;
    }
}

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
      steps: campaign.value.steps
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
    
    console.log("Saved Campaign:", savedCampaign);

  } catch (err) {
    console.error('Error saving campaign:', err);
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
    console.log('Export URL:', result.downloadUrl);
    
    // Download the file or open in new window
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
    
    showRecapModal.value = false;
  } catch (err) {
    console.error('Error exporting campaign recap:', err);
    error.value = 'Failed to export recap. Please try again.';
  }
}

// Helper function to format dates
function formatDate(date) {
  if (!date) return '';
  date = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Format simple date
function formatSimpleDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

// Get initials for a name
function getInitials(name) {
  if (!name) return '';
  
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Handle image error
function handleImageError(event, member) {
  // Prevent further error events by removing the image entirely
  // and setting the avatar to null to trigger the fallback
  if (event.target) {
    // Remove the event handler to prevent multiple calls
    event.target.removeEventListener('error', handleImageError);
    // Hide the broken image
    event.target.style.display = 'none';
  }
  // Set avatar to null to ensure fallback to initials
  member.avatar = null;
}

// Add computed property to sort steps for the recap
const sortedCampaignSteps = computed(() => {
    if (!campaign.value?.steps) return [];
    return [...campaign.value.steps].sort((a, b) => new Date(a.date) - new Date(b.date));
});

// Add helpers to get client/project/assignee names for recap
const getClientName = (clientId) => {
    const client = clients.value.find(c => c.id === clientId);
    return client ? client.name : null;
};
const getProjectName = (projectId) => {
    const project = projects.value.find(p => p.id === projectId);
    return project ? project.title : null;
};
const getAssigneeName = (userId) => {
    const member = teamMembers.value.find(m => m.userId === userId);
    return member ? member.name : 'Unassigned';
};

onMounted(async () => {
  const campaignId = route.params.id;
  loading.value = true;
  
  try {
    await Promise.all([
        loadTeamMembers(),
        loadClientsAndProjects()
    ]);

    if (campaignId) {
        await loadCampaign(campaignId);
    } else {
        campaign.value = {
            id: null, title: '', description: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            clientId: null, projectId: null, types: [], steps: []
        };
        campaignTypes.value.forEach(type => type.active = false);
        timelineEvents.value = [];
        attachments.value = [];
    }
  } catch (err) {
    console.error('Error initializing campaign page:', err);
    error.value = 'Failed to initialize campaign page. Please try again.';
  } finally {
    loading.value = false;
  }
});
</script> 