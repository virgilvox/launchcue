<template>
  <div>
    <Breadcrumb v-if="!loading && campaign" :items="breadcrumbItems" />

    <div v-if="loading" class="text-center py-10">
      <p class="text-[var(--text-secondary)]">Loading campaign details...</p>
    </div>

    <div v-else-if="error" class="text-center py-10">
      <p class="text-[var(--danger)]">{{ error }}</p>
      <router-link to="/campaigns" class="btn btn-primary mt-4">Back to Campaigns</router-link>
    </div>

    <div v-else-if="!campaign" class="text-center py-10">
      <p class="text-[var(--text-secondary)]">Campaign not found</p>
      <router-link to="/campaigns" class="btn btn-primary mt-4">Back to Campaigns</router-link>
    </div>

    <div v-else>
      <!-- Campaign Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div class="flex items-center gap-3">
            <router-link to="/campaigns" class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
            </router-link>
            <h2 class="text-2xl font-bold text-[var(--text-primary)]">{{ campaign.title }}</h2>
          </div>
          <div class="flex items-center mt-2">
            <span 
              v-for="type in campaign.types" 
              :key="type"
              class="mr-2 px-2 py-1 text-xs bg-[var(--accent-primary-wash)] text-[var(--accent-primary)]"
            >
              {{ type }}
            </span>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button @click="editCampaign" class="btn btn-secondary">
            Edit Campaign
          </button>
          <button @click="confirmDeleteCampaign" class="btn btn-danger">
            Delete
          </button>
        </div>
      </div>
      
      <!-- Campaign Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="lg:col-span-2">
          <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 mb-6">
            <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Campaign Details</h3>
            
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-[var(--text-secondary)]">Description</h4>
                <p class="text-[var(--text-primary)] whitespace-pre-line">
                  {{ campaign.description || 'No description available' }}
                </p>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="text-sm font-medium text-[var(--text-secondary)]">Start Date</h4>
                  <p class="text-[var(--text-primary)]">
                    {{ formatDate(campaign.startDate) }}
                  </p>
                </div>
                
                <div>
                  <h4 class="text-sm font-medium text-[var(--text-secondary)]">End Date</h4>
                  <p class="text-[var(--text-primary)]">
                    {{ formatDate(campaign.endDate) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Timeline -->
          <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-[var(--text-primary)]">Timeline</h3>
              <button @click="openAddStepModal" class="btn btn-primary btn-sm">
                Add Step
              </button>
            </div>
            
            <div v-if="stepsLoading" class="text-center py-4">
              <p class="text-[var(--text-secondary)]">Loading timeline...</p>
            </div>
            
            <div v-else-if="!campaignSteps || campaignSteps.length === 0" class="text-center py-6">
              <p class="text-[var(--text-secondary)]">No timeline steps found for this campaign</p>
              <button @click="openAddStepModal" class="text-[var(--accent-primary)] hover:underline mt-2">
                Add your first step
              </button>
            </div>
            
            <div v-else class="relative pl-8 space-y-8">
              <div 
                v-for="(step, index) in campaignSteps" 
                :key="step.id"
                class="relative"
              >
                <!-- Timeline Dot -->
                <div class="absolute -left-8 top-0 w-4 h-4 rounded-full bg-[var(--accent-primary)]"></div>
                
                <!-- Timeline Line -->
                <div v-if="index < campaignSteps.length - 1" class="absolute -left-6 top-4 w-0.5 h-full bg-[var(--border-light)]"></div>
                
                <!-- Timeline Content -->
                <div class="flex flex-col mb-6">
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="text-sm text-[var(--text-secondary)]">{{ formatDate(step.date) }}</div>
                      <div class="text-lg font-medium text-[var(--text-primary)]">{{ step.title }}</div>
                      <div class="text-[var(--text-secondary)] mt-1">{{ step.description }}</div>
                    </div>
                    
                    <div class="flex gap-2">
                      <button @click="editStep(step)" class="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button @click="confirmDeleteStep(step)" class="text-[var(--danger)] hover:opacity-80">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- Assigned Person (if any) -->
                  <div v-if="step.assignee" class="flex items-center mt-2">
                    <div class="w-6 h-6 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-xs font-bold">
                      {{ getInitials(step.assignee.name) }}
                    </div>
                    <span class="text-sm text-[var(--text-primary)] ml-2">{{ step.assignee.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <!-- Team Members Section -->
          <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 mb-6">
            <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Team Members</h3>

            <div v-if="!campaign.teamMembers || campaign.teamMembers.length === 0" class="text-center py-4">
              <p class="text-[var(--text-secondary)]">No team members assigned</p>
            </div>
            
            <div v-else class="space-y-3">
              <div 
                v-for="member in campaign.teamMembers" 
                :key="member.id"
                class="flex items-center justify-between"
              >
                <div class="flex items-center">
                  <div v-if="member.photoUrl" class="w-8 h-8 rounded-full overflow-hidden">
                    <img :src="member.photoUrl" :alt="member.name" 
                         class="w-full h-full object-cover"
                         @error="handleImageError($event, member)"/>
                  </div>
                  <div v-else class="w-8 h-8 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center">
                    {{ getInitials(member.name) }}
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-[var(--text-primary)]">{{ member.name }}</p>
                    <p class="text-xs text-[var(--text-secondary)]">{{ member.role }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Campaign Export -->
          <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
            <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-4">Export Campaign</h3>

            <div class="space-y-4">
              <p class="text-[var(--text-secondary)] text-sm">Export this campaign timeline and details in your preferred format.</p>
              
              <div class="flex flex-col space-y-2">
                <button 
                  @click="exportCampaign('markdown')" 
                  class="btn btn-outline-primary"
                  :disabled="exporting"
                >
                  Export as Markdown
                </button>
                <button 
                  @click="exportCampaign('pdf')" 
                  class="btn btn-outline-primary"
                  :disabled="exporting"
                >
                  Export as PDF
                </button>
                <button 
                  @click="exportCampaign('html')" 
                  class="btn btn-outline-primary"
                  :disabled="exporting"
                >
                  Export as HTML
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Step Modal -->
    <div v-if="showStepModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">
          {{ editingStep ? 'Edit Step' : 'Add Step' }}
        </h3>
        
        <form @submit.prevent="saveStep">
          <div class="mb-4">
            <label for="stepTitle" class="label">Title <span class="text-[var(--danger)]">*</span></label>
            <input 
              id="stepTitle"
              v-model="stepForm.title"
              type="text"
              class="input"
              placeholder="Step title"
              required
            />
          </div>
          
          <div class="mb-4">
            <label for="stepDescription" class="label">Description</label>
            <textarea 
              id="stepDescription"
              v-model="stepForm.description"
              class="input"
              placeholder="Step description"
              rows="3"
            ></textarea>
          </div>
          
          <div class="mb-4">
            <label for="stepDate" class="label">Date <span class="text-[var(--danger)]">*</span></label>
            <input 
              id="stepDate"
              v-model="stepForm.date"
              type="date"
              class="input"
              required
            />
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeStepModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="savingStep"
            >
              {{ savingStep ? 'Saving...' : 'Save Step' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Delete Step Confirmation Modal -->
    <div v-if="showDeleteStepModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Confirm Delete</h3>
        <p class="text-[var(--text-secondary)] mb-6">
          Are you sure you want to delete this step? This action cannot be undone.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeDeleteStepModal"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="deleteStep"
            class="btn btn-danger"
            :disabled="deletingStep"
          >
            {{ deletingStep ? 'Deleting...' : 'Delete Step' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Delete Campaign Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-[var(--text-primary)] mb-4">Confirm Delete</h3>
        <p class="text-[var(--text-secondary)] mb-6">
          Are you sure you want to delete this campaign? This action cannot be undone and will also delete all steps and team member associations.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeDeleteModal"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="deleteCampaign"
            class="btn btn-danger"
            :disabled="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete Campaign' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import campaignService from '@/services/campaign.service';
import Breadcrumb from '@/components/ui/Breadcrumb.vue';
import { getInitials } from '@/utils/formatters';
import { formatDate } from '@/utils/dateFormatter';

const route = useRoute();
const router = useRouter();
const toast = useToast();

// State
const loading = ref(true);
const error = ref(null);
const campaign = ref(null);
const campaignSteps = ref([]);
const stepsLoading = ref(false);
const showStepModal = ref(false);
const showDeleteStepModal = ref(false);
const showDeleteModal = ref(false);
const editingStep = ref(null);
const stepToDelete = ref(null);
const savingStep = ref(false);
const deletingStep = ref(false);
const deleting = ref(false);
const exporting = ref(false);

const stepForm = ref({
  title: '',
  description: '',
  date: ''
});

// Computed
const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Campaigns', to: '/campaigns' },
  { label: campaign.value?.title || 'Campaign' }
]);

// Load campaign data
async function loadCampaign() {
  loading.value = true;
  error.value = null;
  
  try {
    const campaignId = route.params.id;
    campaign.value = await campaignService.getCampaign(campaignId);
    
    // Load campaign steps
    await loadCampaignSteps(campaignId);
  } catch (err) {
    console.error('Error loading campaign:', err);
    error.value = 'Failed to load campaign details. Please try again.';
  } finally {
    loading.value = false;
  }
}

// Load campaign steps
async function loadCampaignSteps(campaignId) {
  stepsLoading.value = true;
  
  try {
    campaignSteps.value = await campaignService.getCampaignSteps(campaignId);
    
    // Sort steps by date
    campaignSteps.value.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (err) {
    console.error('Error loading campaign steps:', err);
    toast.error('Failed to load campaign timeline');
  } finally {
    stepsLoading.value = false;
  }
}

// Handle image loading error
function handleImageError(event, member) {
  // Prevent further error events by removing the image entirely
  // and setting the photo URL to null to trigger the fallback
  if (event.target) {
    // Remove the event handler to prevent multiple calls
    event.target.removeEventListener('error', handleImageError);
    // Hide the broken image
    event.target.style.display = 'none';
  }
  // Set photoUrl to null to ensure fallback to initials
  member.photoUrl = null;
}

// Edit campaign
function editCampaign() {
  router.push(`/campaigns/${campaign.value.id}/edit`);
}

// Open add step modal
function openAddStepModal() {
  editingStep.value = null;
  const today = new Date().toISOString().split('T')[0];
  
  stepForm.value = {
    title: '',
    description: '',
    date: today
  };
  
  showStepModal.value = true;
}

// Edit step
function editStep(step) {
  editingStep.value = step;
  
  stepForm.value = {
    title: step.title,
    description: step.description || '',
    date: step.date ? new Date(step.date).toISOString().split('T')[0] : ''
  };
  
  showStepModal.value = true;
}

// Close step modal
function closeStepModal() {
  showStepModal.value = false;
}

// Save step
async function saveStep() {
  savingStep.value = true;
  
  try {
    const stepData = {
      title: stepForm.value.title,
      description: stepForm.value.description,
      date: stepForm.value.date
    };
    
    if (editingStep.value) {
      // Update existing step
      const updatedStep = await campaignService.updateCampaignStep(
        campaign.value.id,
        editingStep.value.id,
        stepData
      );
      
      // Update local state
      const index = campaignSteps.value.findIndex(s => s.id === editingStep.value.id);
      if (index !== -1) {
        campaignSteps.value[index] = updatedStep;
      }
      
      toast.success('Step updated successfully');
    } else {
      // Create new step
      const newStep = await campaignService.addCampaignStep(campaign.value.id, stepData);
      campaignSteps.value.push(newStep);
      
      // Sort steps by date
      campaignSteps.value.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      toast.success('Step added successfully');
    }
    
    closeStepModal();
  } catch (err) {
    console.error('Error saving step:', err);
    toast.error('Failed to save step');
  } finally {
    savingStep.value = false;
  }
}

// Confirm delete step
function confirmDeleteStep(step) {
  stepToDelete.value = step;
  showDeleteStepModal.value = true;
}

// Close delete step modal
function closeDeleteStepModal() {
  showDeleteStepModal.value = false;
  stepToDelete.value = null;
}

// Delete step
async function deleteStep() {
  if (!stepToDelete.value) return;
  
  deletingStep.value = true;
  
  try {
    await campaignService.deleteCampaignStep(campaign.value.id, stepToDelete.value.id);
    
    // Update local state
    const index = campaignSteps.value.findIndex(s => s.id === stepToDelete.value.id);
    if (index !== -1) {
      campaignSteps.value.splice(index, 1);
    }
    
    toast.success('Step deleted successfully');
    closeDeleteStepModal();
  } catch (err) {
    console.error('Error deleting step:', err);
    toast.error('Failed to delete step');
  } finally {
    deletingStep.value = false;
  }
}

// Confirm delete campaign
function confirmDeleteCampaign() {
  showDeleteModal.value = true;
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
}

// Delete campaign
async function deleteCampaign() {
  deleting.value = true;
  
  try {
    await campaignService.deleteCampaign(campaign.value.id);
    
    toast.success('Campaign deleted successfully');
    
    // Navigate back to campaigns page
    router.push('/campaigns');
  } catch (err) {
    console.error('Error deleting campaign:', err);
    toast.error('Failed to delete campaign');
    deleting.value = false;
  }
}

// Export campaign
async function exportCampaign(format) {
  exporting.value = true;
  
  try {
    const result = await campaignService.exportCampaign(campaign.value.id, format);
    
    if (result.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    } else {
      toast.error('Export failed: No download URL provided');
    }
  } catch (err) {
    console.error('Error exporting campaign:', err);
    toast.error('Failed to export campaign');
  } finally {
    exporting.value = false;
  }
}

// Initialize the component
onMounted(() => {
  loadCampaign();
});
</script> 