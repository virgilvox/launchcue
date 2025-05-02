<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Projects</h2>
      <button @click="openAddProjectModal" class="btn btn-primary">
        Add Project
      </button>
    </div>
    
    <!-- Project List -->
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading projects...</p>
    </div>
    
    <div v-else-if="projects.length === 0" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">No projects found. Add your first project to get started.</p>
    </div>
    
    <div v-else>
      <!-- Filters -->
      <div class="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="statusFilter" class="label">Status</label>
            <select id="statusFilter" v-model="filters.status" class="input">
              <option value="">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div>
            <label for="clientFilter" class="label">Client</label>
            <select id="clientFilter" v-model="filters.clientId" class="input">
              <option value="">All Clients</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>
          
          <div>
            <label for="searchFilter" class="label">Search</label>
            <input 
              id="searchFilter" 
              v-model="filters.search" 
              type="text" 
              class="input" 
              placeholder="Search projects..."
            />
          </div>
        </div>
      </div>
      
      <!-- Project Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="project in filteredProjects" 
          :key="project.id" 
          class="card hover:shadow-lg transition-shadow"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{ project.name || project.title }}</h3>
            <div class="relative">
              <button @click="toggleProjectMenu(project.id)" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <span class="block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mb-1"></span>
                <span class="block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 mb-1"></span>
                <span class="block w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400"></span>
              </button>
              
              <div v-if="activeMenu === project.id" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-1">
                <button 
                  @click="openEditProjectModal(project)"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Edit Project
                </button>
                <router-link 
                  :to="`/projects/${project.id}`"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  View Details
                </router-link>
                <button 
                  @click="confirmDeleteProject(project)"
                  class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
          
          <span 
            class="inline-block px-2 py-1 text-xs rounded-full mb-3"
            :class="{
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100': project.status === 'In Progress',
              'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100': project.status === 'Done',
              'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100': project.status === 'To Do'
            }"
          >
            {{ project.status }}
          </span>
          
          <p class="text-gray-600 dark:text-gray-400 mb-4">{{ project.description }}</p>
          
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Client: {{ getClientName(project.clientId) }}
          </div>
          
          <div class="flex flex-wrap mb-4">
            <span 
              v-for="tag in project.tags" 
              :key="tag"
              class="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs mr-2 mb-2"
            >
              {{ tag }}
            </span>
          </div>
          
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              <div>Start: {{ formatDate(project.startDate) }}</div>
              <div>Due: {{ formatDate(project.dueDate) }}</div>
            </div>
            
            <router-link :to="`/projects/${project.id}`" class="text-primary-600 dark:text-primary-400 hover:underline text-sm">
              View Details
            </router-link>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Project Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          {{ editingProject ? 'Edit Project' : 'Add Project' }}
        </h3>
        
        <form @submit.prevent="saveProject">
          <div class="mb-4">
            <label for="projectTitle" class="label">Project Title</label>
            <input 
              id="projectTitle"
              v-model="projectForm.title"
              type="text"
              class="input"
              placeholder="Website Redesign"
              required
            />
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
            <label for="projectClient" class="label">Client</label>
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
            <label for="projectTags" class="label">Tags (comma separated)</label>
            <input 
              id="projectTags"
              v-model="projectTagsInput"
              type="text"
              class="input"
              placeholder="web, design, documentation"
            />
          </div>
          
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
            <label for="projectDeadline" class="label">Deadline</label>
            <input 
              id="projectDeadline"
              v-model="projectForm.dueDate"
              type="date"
              class="input"
            />
          </div>
          
          <div class="mb-4">
            <label for="projectStatus" class="label">Status</label>
            <select 
              id="projectStatus"
              v-model="projectForm.status"
              class="input"
              required
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeModal"
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
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <span class="font-medium">{{ projectToDelete?.title }}</span>? This action cannot be undone.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeDeleteModal"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="deleteProject"
            class="btn btn-danger"
            :disabled="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useProjectStore } from '../stores/project';
import { useClientStore } from '../stores/client';

const projectStore = useProjectStore();
const clientStore = useClientStore();

const loading = ref(false);
const projects = computed(() => projectStore.projects);
const clients = computed(() => clientStore.clients);
const activeMenu = ref(null);
const showModal = ref(false);
const showDeleteModal = ref(false);
const editingProject = ref(null);
const projectToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);

const filters = ref({
  status: '',
  clientId: '',
  search: ''
});

const projectForm = ref({
  title: '',
  description: '',
  clientId: '',
  tags: [],
  startDate: '',
  dueDate: '',
  status: 'To Do'
});

const projectTagsInput = ref('');

const filteredProjects = computed(() => {
  // Ensure projects.value is an array before filtering
  if (!Array.isArray(projects.value)) return [];
  
  return projects.value.filter(project => {
    // Filter by status
    if (filters.value.status && project.status !== filters.value.status) {
      return false;
    }
    
    // Filter by client
    if (filters.value.clientId && project.clientId !== filters.value.clientId) {
      return false;
    }
    
    // Filter by search term
    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      const matchesTitle = project.title.toLowerCase().includes(searchTerm);
      const matchesDescription = project.description?.toLowerCase().includes(searchTerm) || false;
      
      // Ensure project.tags is an array before using .some()
      const matchesTags = Array.isArray(project.tags) && 
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });
});

// Fetch data when component mounts
onMounted(async () => {
  loading.value = true;
  await projectStore.fetchProjects();
  await clientStore.fetchClients();
  loading.value = false;

  // Close menus when clicking outside
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Watch for changes in projectTagsInput and update projectForm.tags
watch(projectTagsInput, (newValue) => {
  projectForm.value.tags = newValue
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag !== '');
});

function handleOutsideClick(event) {
  if (activeMenu.value && !event.target.closest('.relative')) {
    activeMenu.value = null;
  }
}

function toggleProjectMenu(projectId) {
  if (activeMenu.value === projectId) {
    activeMenu.value = null;
  } else {
    activeMenu.value = projectId;
  }
}

function getClientName(clientId) {
  const client = clients.value.find(c => c.id === clientId);
  return client ? client.name : 'Unknown Client';
}

function formatDate(dateString) {
  if (!dateString) return 'No deadline';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    console.error('Error formatting date:', err, dateString);
    return 'Invalid date';
  }
}

function openAddProjectModal() {
  editingProject.value = null;
  
  // Default to today's date for start date
  const today = new Date().toISOString().split('T')[0];
  
  projectForm.value = {
    title: '',
    description: '',
    clientId: '',
    tags: [],
    startDate: today,
    dueDate: '',
    status: 'To Do'
  };
  projectTagsInput.value = '';
  showModal.value = true;
}

function openEditProjectModal(project) {
  editingProject.value = project;
  
  // Format dates from ISO to YYYY-MM-DD for the date inputs
  let formattedDueDate = '';
  let formattedStartDate = '';
  
  if (project.dueDate) {
    const date = new Date(project.dueDate);
    formattedDueDate = date.toISOString().split('T')[0]; // Gets YYYY-MM-DD format
  }
  
  if (project.startDate) {
    const date = new Date(project.startDate);
    formattedStartDate = date.toISOString().split('T')[0]; // Gets YYYY-MM-DD format
  }
  
  projectForm.value = {
    title: project.title,
    description: project.description,
    clientId: project.clientId,
    tags: [...project.tags],
    startDate: formattedStartDate,
    dueDate: formattedDueDate,
    status: project.status
  };
  
  projectTagsInput.value = project.tags.join(', ');
  activeMenu.value = null;
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function saveProject() {
  saving.value = true;
  
  try {
    // Format the date to ISO string format for backend validation
    const formattedProject = {
      ...projectForm.value
    };
    
    // Convert start date to ISO format if it exists
    if (formattedProject.startDate) {
      formattedProject.startDate = new Date(formattedProject.startDate).toISOString();
    }
    
    // Convert due date to ISO format if it exists
    if (formattedProject.dueDate) {
      // Ensure date is in ISO format (YYYY-MM-DDT00:00:00.000Z)
      formattedProject.dueDate = new Date(formattedProject.dueDate).toISOString();
    }
    
    if (editingProject.value) {
      // Update existing project
      await projectStore.updateProject(editingProject.value.id, formattedProject);
    } else {
      // Create new project
      await projectStore.createProject(formattedProject);
    }
    
    closeModal();
  } catch (error) {
    console.error('Error saving project:', error);
  } finally {
    saving.value = false;
  }
}

function confirmDeleteProject(project) {
  projectToDelete.value = project;
  activeMenu.value = null;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  projectToDelete.value = null;
}

async function deleteProject() {
  if (!projectToDelete.value) return;
  
  deleting.value = true;
  
  try {
    await projectStore.deleteProject(projectToDelete.value.id);
    closeDeleteModal();
  } catch (error) {
    console.error('Error deleting project:', error);
  } finally {
    deleting.value = false;
  }
}
</script> 