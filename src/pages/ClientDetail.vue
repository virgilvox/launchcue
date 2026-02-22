<template>
  <div>
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading client details...</p>
    </div>
    
    <div v-else-if="!client" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Client not found</p>
      <router-link to="/clients" class="btn btn-primary mt-4">Back to Clients</router-link>
    </div>
    
    <div v-else>
      <!-- Client Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div class="flex items-center gap-3">
            <router-link to="/clients" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
            </router-link>
            <h2 class="text-2xl font-bold text-gray-800 dark:text-white">{{ client.name }}</h2>
          </div>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{{ client.industry }}</p>
        </div>
        
        <div class="flex gap-3">
          <router-link 
            :to="`/clients/${client.id}/projects/new`" 
            class="btn btn-primary"
          >
            Create Project
          </router-link>
          <button @click="editClient" class="btn btn-secondary">
            Edit Client
          </button>
        </div>
      </div>
      
      <!-- Client Details -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Details</h3>
            
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Website</h4>
                <p class="text-gray-800 dark:text-white">
                  <a 
                    v-if="client.website" 
                    :href="client.website" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {{ client.website }}
                  </a>
                  <span v-else class="text-gray-500 dark:text-gray-400">Not specified</span>
                </p>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h4>
                <p class="text-gray-800 dark:text-white whitespace-pre-line">
                  {{ client.description || 'No description available' }}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Client Overview</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Projects</h4>
                <p class="text-2xl font-bold text-gray-800 dark:text-white">{{ clientProjects?.length || 0 }}</p>
              </div>
              
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Projects</h4>
                <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {{ getActiveProjectsCount() }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Contacts Section -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Contacts</h3>
              <button @click="openAddContactModal" class="btn btn-primary btn-sm">
                  Add Contact
              </button>
          </div>
          <div v-if="contactsLoading" class="text-center py-4">
              <LoadingSpinner size="small" text="Loading contacts..." />
          </div>
          <div v-else-if="filteredContacts.length === 0" class="text-center py-6">
              <p class="text-sm text-gray-500 dark:text-gray-400">No contacts added yet.</p>
          </div>
          <div v-else class="space-y-4">
              <div v-for="contact in filteredContacts" :key="contact.id" class="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 group">
                  <div class="flex items-center">
                      <!-- Placeholder Avatar -->
                      <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mr-3 flex-shrink-0">
                          <span class="text-lg font-medium">{{ getInitials(contact.name) }}</span>
                      </div>
                      <div>
                          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ contact.name }} <span v-if="contact.isPrimary" class="text-xs font-bold text-primary-600 dark:text-primary-400">(Primary)</span></p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">{{ contact.role || 'No role specified' }}</p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">{{ contact.email || 'No email' }} {{ contact.email && contact.phone ? '•' : '' }} {{ contact.phone || '' }}</p>
                      </div>
                  </div>
                  <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button @click="editContact(contact)" class="btn-icon text-gray-400 hover:text-primary-600 dark:hover:text-primary-400" title="Edit Contact">
                           <PencilIcon class="h-4 w-4" />
                      </button>
                      <button @click="confirmDeleteContact(contact)" class="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-500" title="Delete Contact">
                           <TrashIcon class="h-4 w-4" />
                      </button>
                  </div>
              </div>
          </div>
      </div>
      
      <!-- Projects List -->
      <div>
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-semibold text-gray-800 dark:text-white">Projects</h3>
          <div class="flex gap-2">
            <div class="relative">
              <input 
                type="text" 
                v-model="projectSearch" 
                placeholder="Search projects..." 
                class="input"
              />
              <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                </svg>
              </span>
            </div>
            
            <select v-model="statusFilter" class="input">
              <option value="">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
        
        <div v-if="filteredProjects.length === 0" class="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <p class="text-gray-500 dark:text-gray-400">No projects found</p>
          <router-link :to="`/clients/${client.id}/projects/new`" class="btn btn-primary mt-4">
            Create Your First Project
          </router-link>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Project Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Start Date
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  End Date
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="project in filteredProjects" :key="project.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4">
                  <router-link :to="`/projects/${project.id}`" class="text-primary-600 dark:text-primary-400 hover:underline font-medium">
                    {{ project.name || project.title || 'Untitled Project' }}
                  </router-link>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ project.description }}</p>
                </td>
                <td class="px-6 py-4">
                  <span :class="`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`">
                    {{ project.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {{ formatDate(project.startDate) }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {{ formatDate(project.endDate) }}
                </td>
                <td class="px-6 py-4 text-right text-sm font-medium">
                  <div class="flex justify-end gap-2">
                    <router-link :to="`/projects/${project.id}`" class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      View
                    </router-link>
                    <button @click="editProject(project)" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      Edit
                    </button>
                    <button @click="confirmDeleteProject(project)" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Edit Client Modal -->
    <div v-if="showClientModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Edit Client</h3>
        
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
    
    <!-- Add/Edit Contact Modal -->
    <Modal v-model="showContactModal" :title="editingContact ? 'Edit Contact' : 'Add Contact'">
        <form @submit.prevent="saveContact" class="space-y-4">
            <div class="form-group">
                <label for="contactName" class="label">Name *</label>
                <input id="contactName" v-model="contactForm.name" type="text" class="input" required />
            </div>
             <div class="form-group">
                <label for="contactRole" class="label">Role</label>
                <input id="contactRole" v-model="contactForm.role" type="text" class="input" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-group">
                    <label for="contactEmail" class="label">Email</label>
                    <input id="contactEmail" v-model="contactForm.email" type="email" class="input" />
                </div>
                <div class="form-group">
                    <label for="contactPhone" class="label">Phone</label>
                    <input id="contactPhone" v-model="contactForm.phone" type="tel" class="input" />
                </div>
            </div>
             <div class="form-group">
                <label for="contactNotes" class="label">Notes</label>
                <textarea id="contactNotes" v-model="contactForm.notes" rows="3" class="input"></textarea>
            </div>
             <div class="flex items-center">
                 <input id="contactPrimary" v-model="contactForm.isPrimary" type="checkbox" class="form-checkbox mr-2" />
                <label for="contactPrimary" class="label mb-0">Set as primary contact</label>
            </div>
            <div class="form-actions">
                <button type="button" @click="closeContactModal" class="btn btn-outline">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="savingContact">{{ savingContact ? 'Saving...' : 'Save Contact' }}</button>
            </div>
        </form>
    </Modal>

    <!-- Delete Contact Confirmation Modal -->
     <Modal v-model="showDeleteContactModal" title="Confirm Delete Contact">
      <div v-if="contactToDelete" class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete contact "{{ contactToDelete.name }}"?</p>
        <div class="form-actions">
          <button type="button" @click="closeDeleteContactModal" class="btn btn-outline">Cancel</button>
          <button type="button" @click="deleteContact" class="btn btn-danger" :disabled="deletingContact">{{ deletingContact ? 'Deleting...' : 'Delete Contact' }}</button>
        </div>
      </div>
    </Modal>

    <!-- Delete Project Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete "{{ projectToDelete?.name }}"? This action cannot be undone.
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/auth';
import clientService from '@/services/client.service';
import projectService from '@/services/project.service';
import Modal from '../components/Modal.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// State
const loading = ref(true);
const error = ref(null);
const client = ref(null);
const clientProjects = ref([]);
const projectsLoading = ref(false);
const contactsLoading = ref(false);
const showClientModal = ref(false);
const showDeleteModal = ref(false);
const showContactModal = ref(false);
const showDeleteContactModal = ref(false);
const projectToDelete = ref(null);
const contactToDelete = ref(null);
const editingContact = ref(null);
const saving = ref(false);
const deleting = ref(false);
const savingContact = ref(false);
const deletingContact = ref(false);
const projectSearch = ref('');
const statusFilter = ref('');

const clientForm = ref({
  name: '',
  industry: '',
  website: '',
  description: ''
});

const contactForm = ref({
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: false,
    notes: ''
});

// Computed
const filteredProjects = computed(() => {
  if (!clientProjects.value) return [];
  
  return clientProjects.value.filter(project => {
    const matchesSearch = projectSearch.value === '' || 
      project.name.toLowerCase().includes(projectSearch.value.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(projectSearch.value.toLowerCase()));
    
    const matchesStatus = statusFilter.value === '' || project.status === statusFilter.value;
    
    return matchesSearch && matchesStatus;
  });
});

// Filter out invalid contacts
const filteredContacts = computed(() => {
  if (!client.value || !client.value.contacts) {
    return [];
  }
  
  return (client.value.contacts || []).filter(contact => 
    contact && (contact.name || contact.email || contact.phone)
  );
});

// Load client data
async function loadClient() {
  loading.value = true;
  error.value = null;
  
  try {
    const clientId = route.params.id;
    client.value = await clientService.getClient(clientId);
    
    // Load projects for this client
    await loadClientProjects(clientId);
    
    // Client now includes contacts directly, no need to load them separately
    // If contacts array doesn't exist yet, initialize it
    if (!client.value.contacts) {
      client.value.contacts = [];
    }
  } catch (err) {
    console.error('Error loading client:', err);
    error.value = 'Failed to load client details. Please try again.';
  } finally {
    loading.value = false;
  }
}

// Load client projects
async function loadClientProjects(clientId) {
  projectsLoading.value = true;
  
  try {
    clientProjects.value = await projectService.getProjectsByClient(clientId);
  } catch (err) {
    console.error('Error loading client projects:', err);
    toast.error('Failed to load client projects');
  } finally {
    projectsLoading.value = false;
  }
}

// Remove loadClientContacts function as contacts are now embedded in client
// Instead of deleting it completely, modify it to be a fallback method for backward compatibility
async function loadClientContacts(clientId) {
  if (client.value && client.value.contacts) {
    // Contacts already loaded with client
    return;
  }
  
  contactsLoading.value = true;
  try {
    const response = await clientService.getClientContacts(clientId);
    
    // If client doesn't have contacts property yet, add it
    if (!client.value.contacts) {
      client.value.contacts = [];
    }
    
    // Add any contacts from old API to client object
    if (Array.isArray(response) && response.length > 0) {
      client.value.contacts = response;
    }
  } catch (err) {
    console.error('Error loading client contacts:', err);
    toast.error('Failed to load client contacts');
  } finally {
    contactsLoading.value = false;
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

// Get active projects count
function getActiveProjectsCount() {
  return clientProjects.value?.filter(p => p.status?.toLowerCase() === 'in progress').length || 0;
}

// Get status color class
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'in progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'planned':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

// Edit client
function editClient() {
  clientForm.value = {
    name: client.value.name,
    industry: client.value.industry || '',
    website: client.value.website || '',
    description: client.value.description || ''
  };
  
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
    const updatedClient = await clientService.updateClient(client.value.id, clientForm.value);
    
    // Update local state
    client.value = updatedClient;
    
    toast.success('Client updated successfully');
    closeClientModal();
  } catch (err) {
    console.error('Error saving client:', err);
    error.value = 'Failed to update client. Please try again.';
    toast.error('Failed to update client');
  } finally {
    saving.value = false;
  }
}

// Edit Project
function editProject(project) {
  router.push(`/projects/${project.id}/edit`);
}

// Confirm delete project
function confirmDeleteProject(project) {
  projectToDelete.value = project;
  showDeleteModal.value = true;
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
  projectToDelete.value = null;
}

// Delete project
async function deleteProject() {
  if (!projectToDelete.value) return;
  
  deleting.value = true;
  error.value = null;
  
  try {
    await projectService.deleteProject(projectToDelete.value.id);
    
    // Update local state
    const index = clientProjects.value.findIndex(p => p.id === projectToDelete.value.id);
    if (index !== -1) {
      clientProjects.value.splice(index, 1);
    }
    
    toast.success('Project deleted successfully');
    closeDeleteModal();
  } catch (err) {
    console.error('Error deleting project:', err);
    error.value = 'Failed to delete project. Please try again.';
    toast.error('Failed to delete project');
  } finally {
    deleting.value = false;
  }
}

// Get initials from a name (used for contact avatar fallback)
function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Open add contact modal
function openAddContactModal() {
  editingContact.value = null;
  contactForm.value = {
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: client.value.contacts.length === 0,
    notes: ''
  };
  showContactModal.value = true;
}

function editContact(contact) {
    editingContact.value = contact;
    contactForm.value = { ...contact };
    showContactModal.value = true;
}

function closeContactModal() {
    showContactModal.value = false;
    editingContact.value = null;
}

async function saveContact() {
  savingContact.value = true;
  try {
    const clientId = client.value.id;
    
    // Get the full client and only update the contacts
    const clientToUpdate = { ...client.value };
    
    if (editingContact.value) {
      // Update existing contact
      const contactIndex = clientToUpdate.contacts.findIndex(c => c.id === editingContact.value.id);
      if (contactIndex !== -1) {
        clientToUpdate.contacts[contactIndex] = {
          ...editingContact.value,
          ...contactForm.value
        };
      }
    } else {
      // Add new contact
      if (!clientToUpdate.contacts) {
        clientToUpdate.contacts = [];
      }
      
      // Create new contact
      const newContact = {
        ...contactForm.value,
        id: `contact_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      clientToUpdate.contacts.push(newContact);
    }
    
    // Use client service instead of raw fetch
    const updatedClient = await clientService.updateClient(clientId, clientToUpdate);
    
    // Update local state
    client.value = updatedClient;
    
    toast.success(editingContact.value ? 'Contact updated' : 'Contact added');
    closeContactModal();
  } catch (error) {
    // Only show error if it's not a silent error (operation might have succeeded)
    if (!error.silentError) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } else {
      // For silent errors, still show success because the operation likely worked
      toast.success(editingContact.value ? 'Contact updated' : 'Contact added');
      closeContactModal();
      
      // Reload client data to get updated state
      await loadClient();
    }
  } finally {
    savingContact.value = false;
  }
}

function confirmDeleteContact(contact) {
    contactToDelete.value = contact;
    showDeleteContactModal.value = true;
}

function closeDeleteContactModal() {
    showDeleteContactModal.value = false;
    contactToDelete.value = null;
}

async function deleteContact() {
  if (!contactToDelete.value) return;
  deletingContact.value = true;
  
  try {
    console.log('Deleting contact', contactToDelete.value.id, 'from client', client.value.id);
    
    // Get a copy of the client
    const clientToUpdate = { ...client.value };
    
    // Filter out the contact to delete
    clientToUpdate.contacts = clientToUpdate.contacts.filter(
      c => c.id !== contactToDelete.value.id
    );
    
    // Update the client with the filtered contacts array
    const updatedClient = await clientService.updateClient(client.value.id, clientToUpdate);
    
    // Update local state
    client.value = updatedClient;
    
    toast.success('Contact deleted');
    closeDeleteContactModal();
  } catch (error) {
    // Only show error if it's not a silent error (operation might have succeeded)
    if (!error.silentError) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    } else {
      // For silent errors, still show success because the operation likely worked
      toast.success('Contact deleted');
      closeDeleteContactModal();
      
      // Reload client data to get updated state
      await loadClient();
    }
  } finally {
    deletingContact.value = false;
  }
}

// Lifecycle hooks
onMounted(() => {
  loadClient();
});
</script> 