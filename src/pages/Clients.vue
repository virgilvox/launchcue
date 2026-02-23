<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Clients</h2>
      <div class="flex space-x-3">
        <button 
          v-if="showMigrationButton" 
          @click="runContactMigration" 
          class="btn btn-secondary"
          :disabled="migratingContacts"
        >
          {{ migratingContacts ? 'Fixing Contacts...' : 'Fix Contacts Issue' }}
        </button>
        <button @click="openAddClientModal" class="btn btn-primary">
          Add Client
        </button>
      </div>
    </div>
    
    <!-- Contact Migration Success Alert -->
    <div v-if="migrationSuccess" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
      <span class="block sm:inline">Contact migration completed successfully.</span>
      <span class="absolute top-0 bottom-0 right-0 px-4 py-3" @click="migrationSuccess = false">
        <svg class="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
      </span>
    </div>
    
    <!-- Client List -->
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading clients...</p>
    </div>
    
    <div v-else-if="clients.length === 0" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">No clients found. Add your first client to get started.</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="client in filteredClients" 
        :key="client.id"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col" 
      >
        <!-- Make header clickable -->
        <router-link :to="`/clients/${client.id}`" class="block p-6 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex-shrink-0">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-primary-600">{{ client.name }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ client.industry || 'No industry specified' }}</p>
            </div>
             <!-- Keep Menu Button separate from link -->
             <div class="relative z-10" @click.stop.prevent> 
              <button @click.stop.prevent="toggleClientMenu(client.id)" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                   <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                 </svg>
               </button>
               <div v-if="activeMenu === client.id" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border dark:border-gray-700" @click.stop>
                  <!-- Menu items... -->
                   <button @click.stop.prevent="editClient(client)" class="context-menu-item">Edit Client</button>
                   <button @click.stop.prevent="confirmDeleteClient(client)" class="context-menu-item text-red-600 dark:text-red-400">Delete Client</button>
               </div>
             </div>
          </div>
        </router-link>
        
        <!-- Client Projects Summary -->
        <div class="p-6 flex-grow">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</h4>
            <router-link 
              :to="`/clients/${client.id}/projects/new`" 
              class="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              + New Project
            </router-link>
          </div>
          
          <div v-if="client.projects && client.projects.length > 0" class="space-y-3">
            <div 
              v-for="project in client.projects.slice(0, 3)" 
              :key="project.id"
              class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
            >
              <div>
                <router-link 
                  :to="`/projects/${project.id}`" 
                  class="text-sm font-medium text-gray-800 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {{ project.name || project.title || 'Untitled Project' }}
                </router-link>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ project.status }}</div>
              </div>
              <div :class="`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status || 'Planned')}`">
                {{ project.status || 'Planned' }}
              </div>
            </div>
            
            <div v-if="client.projects.length > 3" class="text-center mt-2">
              <router-link 
                :to="`/clients/${client.id}`" 
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                View all {{ client.projects.length }} projects
              </router-link>
            </div>
          </div>
          
          <div v-else class="text-center py-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">No projects yet</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Client Modal -->
    <div v-if="showClientModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          {{ editingClient ? 'Edit Client' : 'Add Client' }}
        </h3>
        
        <form @submit.prevent="saveClient">
          <div class="mb-4">
            <label for="clientName" class="label">Client Name</label>
            <input 
              id="clientName"
              v-model="clientForm.name"
              type="text"
              class="input"
              placeholder="Client name"
              required
            />
          </div>
          
          <div class="mb-4">
            <label for="clientIndustry" class="label">Industry</label>
            <input 
              id="clientIndustry"
              v-model="clientForm.industry"
              type="text"
              class="input"
              placeholder="Industry"
            />
          </div>
          
          <div class="mb-4">
            <label for="clientWebsite" class="label">Website</label>
            <input 
              id="clientWebsite"
              v-model="clientForm.website"
              type="url"
              class="input"
              placeholder="https://example.com"
            />
          </div>
          
          <div class="mb-6">
            <label for="clientDescription" class="label">Description</label>
            <textarea 
              id="clientDescription"
              v-model="clientForm.description"
              class="input"
              placeholder="Client description"
              rows="3"
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeClientModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              {{ saving ? 'Saving...' : 'Save Client' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Delete Client Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.stop>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" @click.stop>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this client? This action will also delete all projects associated with this client and cannot be undone.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click.stop="closeDeleteModal"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="deleteClient($event)"
            class="btn btn-danger"
            :disabled="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete Client' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add helper class for menu items if needed */
.context-menu-item {
    @apply block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700;
}
</style>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useClientStore } from '../stores/client';
import clientService from '@/services/client.service';
import projectService from '@/services/project.service';
import { useToast } from 'vue-toastification';
import { getStatusColor } from '@/utils/statusColors';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const clientStore = useClientStore();

const loading = ref(false);
const error = ref(null);
const clients = ref([]);
const activeMenu = ref(null);
const showClientModal = ref(false);
const showDeleteModal = ref(false);
const editingClient = ref(null);
const clientToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);
const showMigrationButton = ref(false);
const migratingContacts = ref(false);
const migrationSuccess = ref(false);
const searchQuery = ref('');

const clientForm = ref({
  name: '',
  industry: '',
  website: '',
  description: ''
});

// Fetch clients
async function loadClients() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await clientStore.fetchClients();
    clients.value = response;
    
    // Also load projects for all clients
    await loadClientProjects();
    
  } catch (err) {
    console.error('Error loading clients:', err);
    error.value = 'Failed to load clients. Please try again.';
    toast.error('Failed to load clients');
  } finally {
    loading.value = false;
  }
}

// Toggle client menu
function toggleClientMenu(clientId) {
  if (activeMenu.value === clientId) {
    activeMenu.value = null;
  } else {
    activeMenu.value = clientId;
  }
}

// Open add client modal
function openAddClientModal() {
  editingClient.value = null;
  clientForm.value = {
    name: '',
    industry: '',
    website: '',
    description: ''
  };
  showClientModal.value = true;
}

// Edit client
function editClient(client) {
  editingClient.value = client;
  clientForm.value = {
    name: client.name,
    industry: client.industry || '',
    website: client.website || '',
    description: client.description || ''
  };
  activeMenu.value = null;
  showClientModal.value = true;
}

// Close client modal
function closeClientModal() {
  showClientModal.value = false;
}

// Save client
async function saveClient() {
  saving.value = true;
  error.value = null;
  
  try {
    if (editingClient.value) {
      // Update existing client
      const updatedClient = await clientService.updateClient(editingClient.value.id, clientForm.value);
      
      // Update local state
      const index = clients.value.findIndex(c => c.id === editingClient.value.id);
      if (index !== -1) {
        const projects = clients.value[index].projects || [];
        clients.value[index] = {
          ...updatedClient,
          projects
        };
      }
      
      toast.success('Client updated successfully');
    } else {
      // Create new client
      const newClient = await clientService.createClient(clientForm.value);
      
      // Add to local state
      clients.value.push({
        ...newClient,
        projects: []
      });
      
      toast.success('Client added successfully');
    }
    
    closeClientModal();
  } catch (err) {
    console.error('Error saving client:', err);
    error.value = 'Failed to save client. Please try again.';
    toast.error('Failed to save client');
  } finally {
    saving.value = false;
  }
}

// Confirm delete client
function confirmDeleteClient(client, event) {
  clientToDelete.value = client;
  activeMenu.value = null;
  showDeleteModal.value = true;
  // Prevent event propagation to avoid navigation
  if (event) event.stopPropagation();
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
  clientToDelete.value = null;
}

// Delete client
async function deleteClient(event) {
  if (!clientToDelete.value) return;
  
  // Prevent navigation
  if (event) event.preventDefault();
  
  deleting.value = true;
  error.value = null;
  
  try {
    await clientService.deleteClient(clientToDelete.value.id);
    
    // Update local state
    const index = clients.value.findIndex(c => c.id === clientToDelete.value.id);
    if (index !== -1) {
      clients.value.splice(index, 1);
    }
    
    toast.success('Client deleted successfully');
    closeDeleteModal();
  } catch (err) {
    console.error('Error deleting client:', err);
    error.value = 'Failed to delete client. Please try again.';
    toast.error('Failed to delete client');
  } finally {
    deleting.value = false;
  }
}


function handleOutsideClick(event) {
  if (activeMenu.value && !event.target.closest('.relative')) {
    activeMenu.value = null;
  }
}

// Lifecycle hooks
onMounted(async () => {
  await loadClients();
  
  // Close menus when clicking outside
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

// Run contact migration
async function runContactMigration() {
  migratingContacts.value = true;
  
  try {
    const result = await clientStore.runContactMigration();
    if (result.success) {
      showMigrationButton.value = false;
      migrationSuccess.value = true;
      
      // Reload clients
      await loadClients();
    }
  } catch (err) {
    console.error('Error running contact migration:', err);
    toast.error('Failed to run contact migration');
  } finally {
    migratingContacts.value = false;
  }
}

// Calculate filtered clients based on search
const filteredClients = computed(() => {
  if (!Array.isArray(clients.value)) return [];
  
  // ABSOLUTE SAFETY - filter out any contacts from the client list
  // This is a backup in case the backend or store filtering fails
  const safeClients = clients.value.filter(client => 
    // A contact always has a clientId property - exclude those items
    !client.clientId
  );
  
  // Apply search filtering if provided
  if (!searchQuery.value) return safeClients;
  
  const query = searchQuery.value.toLowerCase();
  return safeClients.filter(client => 
    client.name.toLowerCase().includes(query) || 
    (client.industry && client.industry.toLowerCase().includes(query))
  );
});

// Add the following function to fetch projects for clients
async function loadClientProjects() {
  try {
    // Loop through all clients and ensure they have projects
    for (const client of clients.value) {
      if (!client.projects || !Array.isArray(client.projects) || client.projects.length === 0) {
        try {
          console.log(`Fetching projects for client: ${client.name} (${client.id})`);
          const projectsResponse = await clientService.getClientProjects(client.id);
          
          // Update the client locally with projects
          if (Array.isArray(projectsResponse)) {
            client.projects = projectsResponse;
          } else {
            client.projects = [];
          }
        } catch (error) {
          console.error(`Error fetching projects for client ${client.id}:`, error);
          client.projects = [];
        }
      }
    }
  } catch (error) {
    console.error('Error loading client projects:', error);
  }
}
</script> 