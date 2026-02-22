<template>
  <div>
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div class="flex items-center gap-3">
        <router-link 
          :to="clientId ? `/clients/${clientId}` : '/projects'" 
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
        </router-link>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">
          {{ isEditing ? 'Edit Project' : 'Create Project' }}
        </h2>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div v-if="loading" class="text-center py-4">
        <p class="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
      
      <div v-else>
        <form @submit.prevent="submitForm">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="mb-4">
                <label for="projectName" class="label">Project Title <span class="text-red-500">*</span></label>
                <input 
                  id="projectName"
                  v-model="projectForm.title"
                  type="text"
                  class="input"
                  placeholder="Project title"
                  required
                />
              </div>
              
              <div class="mb-4">
                <label for="projectClient" class="label">Client <span class="text-red-500">*</span></label>
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
                    class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {{ tag }}
                    <button 
                      type="button" 
                      @click="removeTag(index)" 
                      class="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      &times;
                    </button>
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <div class="mb-4">
                <label for="projectStatus" class="label">Status <span class="text-red-500">*</span></label>
                <select 
                  id="projectStatus"
                  v-model="projectForm.status"
                  class="input"
                  required
                >
                  <option value="NotStarted">Not Started</option>
                  <option value="InProgress">In Progress</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              <div class="mb-4">
                <label for="projectPriority" class="label">Priority</label>
                <select 
                  id="projectPriority"
                  v-model="projectForm.priority"
                  class="input"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import projectService from '@/services/project.service';
import clientService from '@/services/client.service';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import { useTeamStore } from '@/stores/team';
import { formatDate } from '../utils/dateFormatter';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const clientStore = useClientStore();
const projectStore = useProjectStore();
const teamStore = useTeamStore();

const loading = ref(true);
const saving = ref(false);
const error = ref(null);
const tagsInput = ref('');
const clients = computed(() => clientStore.clients.filter(client => !client.isContact));

const projectForm = ref({
  title: '',
  description: '',
  status: 'NotStarted',
  priority: 'Medium',
  startDate: formatDate(new Date()),
  dueDate: '',
  budget: 0,
  clientId: '',
  tags: []
});

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
      console.log('Loading project with ID:', projectId);
      const project = await projectService.getProject(projectId);
      
      projectForm.value = {
        title: project.name || project.title || '',  // Handle both name and title properties
        description: project.description || '',
        status: project.status || 'NotStarted',
        priority: project.priority || 'Medium',
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        dueDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        budget: project.budget || '',
        clientId: project.clientId || '',
        tags: project.tags || []
      };
      
      // Update tags input
      tagsInput.value = '';
    } catch (err) {
      console.error('Error loading project:', err);
      error.value = 'Failed to load project. Please try again.';
      toast.error('Failed to load project details');
    }
  } else if (isClientProject.value) {
    // If creating a new project for a client, set the client ID
    projectForm.value.clientId = route.params.clientId;
    
    // Optional: Load client details
    try {
      const client = await clientService.getClient(route.params.clientId);
      
      // You can use client details if needed
      // e.g., set project name to include client name
      if (client && client.name) {
        projectForm.value.title = `${client.name} - `;
      }
    } catch (err) {
      console.error('Error loading client:', err);
      // Not critical, so we don't set error state
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
      priority: projectForm.value.priority,
      startDate: projectForm.value.startDate,
      endDate: projectForm.value.dueDate,
      budget: projectForm.value.budget,
      clientId: projectForm.value.clientId,
      tags: projectForm.value.tags
    };
    
    if (projectForm.value.startDate) {
      projectData.startDate = new Date(projectForm.value.startDate);
    }
    
    if (projectForm.value.dueDate) {
      projectData.endDate = new Date(projectForm.value.dueDate);
    }
    
    if (projectForm.value.budget && !isNaN(parseFloat(projectForm.value.budget))) {
      projectData.budget = parseFloat(projectForm.value.budget);
    }
    
    let result;
    
    if (editMode.value) {
      // Update existing project
      console.log('Updating project with ID:', projectId);
      console.log('Project data:', projectData);
      result = await projectStore.updateProject(projectId, projectData);
      toast.success('Project updated successfully');
    } else {
      // Create new project
      result = await projectStore.createProject(projectData);
      toast.success('Project created successfully');
    }
    
    // Navigate back
    navigateBack(result);
  } catch (err) {
    console.error('Error saving project:', err);
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
      const project = await projectStore.fetchProject(projectId);
      console.log('Fetched project for editing:', project);
      
      if (project) {
        // Handle both name and title for backward compatibility
        projectForm.value.title = project.title || project.name || '';
        projectForm.value.description = project.description || '';
        projectForm.value.status = project.status || 'NotStarted';
        projectForm.value.priority = project.priority || 'Medium';
        projectForm.value.clientId = project.clientId || '';
        projectForm.value.tags = project.tags || [];
        
        // Format dates for the form
        if (project.startDate) {
          projectForm.value.startDate = formatDate(new Date(project.startDate));
        }
        
        // Handle both dueDate and endDate fields for backward compatibility
        if (project.dueDate) {
          projectForm.value.dueDate = formatDate(new Date(project.dueDate));
        } else if (project.endDate) {
          // Handle legacy endDate field
          projectForm.value.dueDate = formatDate(new Date(project.endDate));
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
        console.error('Error fetching client details:', err);
      }
    }
  } catch (error) {
    console.error('Error initializing project form:', error);
    toast.error(`Error loading project data: ${error.message}`);
  } finally {
    loading.value = false;
  }
});
</script> 