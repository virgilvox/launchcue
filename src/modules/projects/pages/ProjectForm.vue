<template>
  <PageContainer>
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div class="flex items-center gap-3">
        <router-link 
          :to="clientId ? `/clients/${clientId}` : '/projects'" 
          class="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </router-link>
        <h2 class="heading-page">
          {{ isEditing ? 'Edit Project' : 'Create Project' }}
        </h2>
      </div>
    </div>
    
    <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
      <div v-if="loading" class="text-center py-4">
        <LoadingSpinner text="Loading..." />
      </div>
      
      <div v-else>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="mb-4">
                <label for="projectName" class="label">Project Title <span class="text-[var(--danger)]">*</span></label>
                <input 
                  id="projectName"
                  v-model="projectForm.title"
                  type="text"
                  class="input"
                  placeholder="Project title"
                  maxlength="200"
                  required
                />
              </div>
              
              <div class="mb-4">
                <label for="projectClient" class="label">Client <span class="text-[var(--danger)]">*</span></label>
                <select 
                  id="projectClient"
                  v-model="projectForm.clientId"
                  class="input"
                  required
                >
                  <option value="" disabled>Select a client</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                    {{ client.name }}
                  </option>
                </select>
              </div>
              
              <div class="mb-4">
                <label for="projectDescription" class="label">Description</label>
                <textarea 
                  id="projectDescription"
                  v-model="projectForm.description"
                  class="input"
                  placeholder="Project description"
                  rows="3"
                  maxlength="2000"
                ></textarea>
              </div>
              
              <div class="mb-4">
                <label for="projectTags" class="label">Tags</label>
                <input 
                  id="projectTags"
                  v-model="tagsInput"
                  type="text"
                  class="input"
                  placeholder="Enter tags separated by commas"
                />
                <div v-if="projectForm.tags.length > 0" class="flex flex-wrap gap-2 mt-2">
                  <span 
                    v-for="(tag, index) in projectForm.tags" 
                    :key="index"
                    class="bg-[var(--surface)] text-[var(--text-primary)] px-3 py-1 text-sm flex items-center border-2 border-[var(--border-light)]"
                  >
                    {{ tag }}
                    <button 
                      type="button" 
                      @click="removeTag(index)" 
                      class="ml-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      &times;
                    </button>
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div class="mb-4">
                <label for="projectStatus" class="label">Status <span class="text-[var(--danger)]">*</span></label>
                <select 
                  id="projectStatus"
                  v-model="projectForm.status"
                  class="input"
                  required
                >
                  <option value="Planning">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="mb-4">
                  <label for="projectStartDate" class="label">Start Date</label>
                  <input 
                    id="projectStartDate"
                    v-model="projectForm.startDate"
                    type="date"
                    class="input"
                  />
                </div>
                
                <div class="mb-4">
                  <label for="projectEndDate" class="label">Deadline</label>
                  <input 
                    id="projectEndDate"
                    v-model="projectForm.dueDate"
                    type="date"
                    class="input"
                  />
                </div>
              </div>
              
              <div class="mb-4">
                <label for="projectBudget" class="label">Budget</label>
                <input 
                  id="projectBudget"
                  v-model="projectForm.budget"
                  type="text"
                  class="input"
                  placeholder="Budget amount"
                />
              </div>
            </div>
          </div>
          
          <div class="flex justify-end space-x-3 mt-6">
            <button 
              type="button"
              @click="cancel"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : 'Save Project' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import { formatDate } from '@/utils/dateFormatter';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges';
import PageContainer from '@/components/ui/PageContainer.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const clientStore = useClientStore();
const projectStore = useProjectStore();

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const tagsInput = ref('');
const clients = computed(() => clientStore.clients.filter(client => !client.isContact));

const projectForm = ref({
  title: '',
  description: '',
  status: 'Planning',
  startDate: formatDate(new Date()),
  dueDate: '',
  budget: 0,
  clientId: '',
  tags: []
});

const { isDirty, markLoaded, markClean } = useUnsavedChanges(() => projectForm.value);

const isEditing = computed(() => {
  return route.params.id !== undefined;
});

const isClientProject = computed(() => {
  return route.params.clientId !== undefined;
});

const projectId = route.params.id;
const clientId = route.query.clientId;
const editMode = ref(!!projectId);

// Watch tags input to update tags array
watch(tagsInput, (value) => {
  if (value.includes(',')) {
    const newTags = value.split(',').map(tag => tag.trim()).filter(tag => tag);

    newTags.forEach(tag => {
      if (!projectForm.value.tags.includes(tag)) {
        projectForm.value.tags.push(tag);
      }
    });

    tagsInput.value = '';
  }
});

function removeTag(index) {
  projectForm.value.tags.splice(index, 1);
}

async function loadProject() {
  loading.value = true;
  
  if (isEditing.value) {
    try {
      const projectId = route.params.id;
      const project = await projectStore.getProject(projectId);
      
      projectForm.value = {
        title: project.title || '',
        description: project.description || '',
        status: project.status || 'Planning',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
        budget: project.budget || '',
        clientId: project.clientId || '',
        tags: project.tags || []
      };
      
      // Update tags input
      tagsInput.value = '';
    } catch (err) {
      error.value = 'Failed to load project. Please try again.';
      toast.error('Failed to load project details');
    }
  } else if (isClientProject.value) {
    // If creating a new project for a client, set the client ID
    projectForm.value.clientId = route.params.clientId;
    
    // Optional: Load client details
    try {
      const result = await clientStore.getClient(route.params.clientId);

      // You can use client details if needed
      // e.g., set project name to include client name
      if (result.success && result.client && result.client.name) {
        projectForm.value.title = `${result.client.name} - `;
      }
    } catch (err) {
      toast.error('Failed to load client details. Please try again.');
    }
  }
  
  loading.value = false;
}

async function submitForm() {
  saving.value = true;
  error.value = null;
  
  try {
    // Add any remaining tags from the input
    if (tagsInput.value.trim()) {
      projectForm.value.tags.push(tagsInput.value.trim());
      tagsInput.value = '';
    }
    
    // Format project data for API
    const projectData = {
      title: projectForm.value.title,
      description: projectForm.value.description,
      status: projectForm.value.status,
      startDate: projectForm.value.startDate,
      dueDate: projectForm.value.dueDate,
      budget: projectForm.value.budget,
      clientId: projectForm.value.clientId,
      tags: projectForm.value.tags
    };

    if (projectForm.value.startDate) {
      projectData.startDate = new Date(projectForm.value.startDate).toISOString().split('T')[0];
    }

    if (projectForm.value.dueDate) {
      projectData.dueDate = new Date(projectForm.value.dueDate).toISOString().split('T')[0];
    }
    
    if (projectForm.value.budget && !isNaN(parseFloat(projectForm.value.budget))) {
      projectData.budget = parseFloat(projectForm.value.budget);
    }
    
    let result;
    
    if (editMode.value) {
      // Update existing project
      result = await projectStore.updateProject(projectId, projectData);
      toast.success('Project updated successfully');
    } else {
      // Create new project
      result = await projectStore.createProject(projectData);
      toast.success('Project created successfully');
    }

    markClean();

    // Navigate back
    navigateBack(result);
  } catch (err) {
    error.value = 'Failed to save project. Please try again.';
    toast.error('Failed to save project');
  } finally {
    saving.value = false;
  }
}

function cancel() {
  navigateBack();
}

function navigateBack(project = null) {
  if (isClientProject.value && !isEditing.value) {
    // If we came from a client page and created a new project
    router.push(`/clients/${route.params.clientId}`);
  } else if (isEditing.value && project) {
    // If we edited a project, go to that project's detail page
    router.push(`/projects/${project.id}`);
  } else if (project) {
    // If we created a project, go to that project's detail page
    router.push(`/projects/${project.id}`);
  } else {
    // Otherwise go to the projects list
    router.push('/projects');
  }
}

onMounted(async () => {
  try {
    loading.value = true;
    
    // Fetch clients first
    await clientStore.fetchClients();
    
    // If editing an existing project
    if (editMode.value && projectId) {
      const project = await projectStore.getProject(projectId);
      if (project) {
        projectForm.value.title = project.title || '';
        projectForm.value.description = project.description || '';
        projectForm.value.status = project.status || 'Planning';
        projectForm.value.clientId = project.clientId || '';
        projectForm.value.tags = project.tags || [];
        
        // Format dates for the form
        if (project.startDate) {
          projectForm.value.startDate = formatDate(new Date(project.startDate));
        }
        
        if (project.dueDate) {
          projectForm.value.dueDate = formatDate(new Date(project.dueDate));
        }
        
        projectForm.value.budget = project.budget || 0;
      }
    } 
    // If creating a project for a specific client
    else if (clientId) {
      projectForm.value.clientId = clientId;
      
      // Optionally fetch client details and pre-populate related fields
      try {
        const client = await clientStore.fetchClient(clientId);
        if (client) {
          // Set project title to include client name
          projectForm.value.title = `${client.name} Project`;
        }
      } catch (err) {
        toast.error('Failed to load client details. Please try again.');
      }
    }
  } catch (error) {
    toast.error(`Error loading project data: ${error.message}`);
  } finally {
    loading.value = false;
    // Use nextTick delay to ensure the watch skips the initial population
    markLoaded();
  }
});
</script> 