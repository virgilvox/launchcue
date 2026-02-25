<template>
  <PageContainer>
    <PageHeader title="Clients">
      <template #actions>
        <button 
          v-if="showMigrationButton" 
          @click="runContactMigration" 
          class="btn btn-secondary"
          :disabled="migratingContacts"
        >
          {{ migratingContacts ? 'FIXING...' : 'FIX CONTACTS' }}
        </button>
        <button v-if="authStore.canEdit" @click="openAddClientModal" class="btn btn-primary">
          <PlusIcon class="h-4 w-4 mr-2" />
          ADD CLIENT
        </button>
      </template>
    </PageHeader>
    
    <!-- Migration Success Alert -->
    <div v-if="migrationSuccess" class="mb-6 p-4 border-2 border-[var(--success)] bg-[var(--surface)] flex justify-between items-center">
      <span>Contact migration completed successfully.</span>
      <button @click="migrationSuccess = false" class="btn-icon">
        <XMarkIcon class="h-5 w-5" />
      </button>
    </div>
    
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner text="Loading clients..." />
    </div>
    
    <!-- Empty State -->
    <EmptyState
      v-else-if="clients.length === 0"
      :icon="UsersIcon"
      title="No clients yet"
      description="Your client list is the backbone of your practice. Add clients to start organizing."
      actionLabel="ADD CLIENT"
      @action="openAddClientModal"
    />
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="client in filteredClients"
        :key="client.id"
        class="card flex flex-col"
        :style="{ borderLeftWidth: '4px', borderLeftColor: getClientColor(client.color) }"
      >
        <!-- Client Header -->
        <router-link :to="`/clients/${client.id}`" class="block pb-4 border-b-2 border-[var(--border-light)] flex-shrink-0 hover:opacity-80 transition-opacity">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="heading-card">{{ client.name }}</h3>
              <p class="text-caption">{{ client.industry || 'No industry specified' }}</p>
            </div>
            <div class="relative z-10" @click.stop.prevent> 
              <button @click.stop.prevent="toggleClientMenu(client.id)" class="btn-icon">
                <EllipsisVerticalIcon class="h-5 w-5" />
              </button>
              <div v-if="activeMenu === client.id" class="absolute right-0 mt-1 w-48 bg-[var(--surface-elevated)] border-2 border-[var(--border)] shadow-brutal-sm z-20 py-1" @click.stop>
                <button v-if="authStore.canEdit" @click.stop.prevent="editClient(client)" class="block w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface)]">Edit Client</button>
                <button v-if="authStore.canEdit" @click.stop.prevent="confirmDeleteClient(client)" class="block w-full text-left px-4 py-2 text-sm text-[var(--danger)] hover:bg-[var(--accent-primary-wash)]">Delete Client</button>
              </div>
            </div>
          </div>
        </router-link>
        
        <!-- Client Projects -->
        <div class="pt-4 flex-grow">
          <div class="flex items-center justify-between mb-3">
            <span class="overline">PROJECTS</span>
            <router-link 
              :to="`/clients/${client.id}/projects/new`" 
              class="text-body-sm text-[var(--accent-primary)] hover:underline"
            >
              + New
            </router-link>
          </div>
          
          <div v-if="client.projects && client.projects.length > 0" class="space-y-2">
            <div 
              v-for="project in client.projects.slice(0, 3)" 
              :key="project.id"
              class="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0"
            >
              <div class="min-w-0 flex-1 mr-2">
                <router-link 
                  :to="`/projects/${project.id}`" 
                  class="text-body-sm font-medium hover:text-[var(--accent-primary)] truncate block"
                >
                  {{ project.name || project.title || 'Untitled Project' }}
                </router-link>
              </div>
              <span :class="['badge', getStatusColor(project.status || 'Planned')]">
                {{ project.status || 'Planned' }}
              </span>
            </div>
            
            <div v-if="client.projects.length > 3" class="text-center mt-2">
              <router-link 
                :to="`/clients/${client.id}`" 
                class="text-body-sm text-[var(--accent-primary)] hover:underline"
              >
                View all {{ client.projects.length }} projects
              </router-link>
            </div>
          </div>
          
          <div v-else class="text-center py-4">
            <p class="text-caption">No projects yet</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Client Modal -->
    <Modal v-model="showClientModal" :title="editingClient ? 'Edit Client' : 'Add Client'">
      <form @submit.prevent="saveClient" class="space-y-4">
        <div class="form-group">
          <label for="clientName" class="label">CLIENT NAME</label>
          <input id="clientName" v-model="clientForm.name" type="text" class="input" placeholder="Client name" required />
          <p v-if="submitted && validationErrors.name" class="text-xs mt-1" style="color: var(--danger);">{{ validationErrors.name }}</p>
        </div>
        
        <div class="form-group">
          <label for="clientIndustry" class="label">INDUSTRY</label>
          <input id="clientIndustry" v-model="clientForm.industry" type="text" class="input" placeholder="Industry" />
        </div>
        
        <div class="form-group">
          <label for="clientWebsite" class="label">WEBSITE</label>
          <input id="clientWebsite" v-model="clientForm.website" type="url" class="input" placeholder="https://example.com" />
        </div>
        
        <div class="form-group">
          <label for="clientDescription" class="label">DESCRIPTION</label>
          <textarea id="clientDescription" v-model="clientForm.description" class="form-textarea" placeholder="Client description" rows="3"></textarea>
        </div>

        <ClientColorPicker v-model="clientForm.color" />

        <div class="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border-light)]">
          <button type="button" @click="closeClientModal" class="btn btn-secondary">CANCEL</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'SAVING...' : 'SAVE CLIENT' }}
          </button>
        </div>
      </form>
    </Modal>
    
    <!-- Delete Client Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete" size="sm">
      <div class="space-y-4">
        <p>Are you sure you want to delete this client? This will also delete all associated projects and cannot be undone.</p>

        <div class="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border-light)]">
          <button @click.stop="closeDeleteModal" class="btn btn-secondary">CANCEL</button>
          <button @click="deleteClient($event)" class="btn btn-danger" :disabled="deleting">
            {{ deleting ? 'DELETING...' : 'DELETE CLIENT' }}
          </button>
        </div>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useClientStore } from '../stores/client';
import { useProjectStore } from '../stores/project';
import clientService from '@/services/client.service';
import { useToast } from 'vue-toastification';
import { getStatusColor } from '@/utils/statusColors';
import { PlusIcon, UsersIcon, EllipsisVerticalIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import Modal from '../components/Modal.vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import ClientColorPicker from '../components/ui/ClientColorPicker.vue';
import { getNextClientColor, getClientColor } from '@/constants/clientColors';

import { useAuthStore } from '@/stores/auth';
const toast = useToast();
const clientStore = useClientStore();
const projectStore = useProjectStore();
const authStore = useAuthStore();

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
  description: '',
  color: 'slate'
});

// Validation state
const validationErrors = reactive({ name: '' });
const submitted = ref(false);

async function loadClients() {
  loading.value = true;
  error.value = null;

  try {
    // Fetch clients and projects in parallel (single request each)
    const [clientResponse] = await Promise.allSettled([
      clientStore.fetchClients(),
      projectStore.fetchProjects(),
    ]);

    // Safely extract clients array
    const result = clientResponse.status === 'fulfilled' ? clientResponse.value : [];
    clients.value = Array.isArray(result) ? result : [];

    // Attach projects from the store (no extra API calls)
    attachProjectsFromStore();
  } catch (err) {
    error.value = 'Failed to load clients. Please try again.';
    toast.error('Failed to load clients');
  } finally {
    loading.value = false;
  }
}

function attachProjectsFromStore() {
  const allProjects = Array.isArray(projectStore.projects) ? projectStore.projects : [];
  for (const client of clients.value) {
    client.projects = allProjects.filter(p => p.clientId === client.id);
  }
}

function toggleClientMenu(clientId) {
  if (activeMenu.value === clientId) {
    activeMenu.value = null;
  } else {
    activeMenu.value = clientId;
  }
}

function openAddClientModal() {
  editingClient.value = null;
  clientForm.value = { name: '', industry: '', website: '', description: '', color: getNextClientColor(clients.value) };
  validationErrors.name = '';
  submitted.value = false;
  showClientModal.value = true;
}

function editClient(client) {
  editingClient.value = client;
  clientForm.value = {
    name: client.name,
    industry: client.industry || '',
    website: client.website || '',
    description: client.description || '',
    color: client.color || 'slate'
  };
  validationErrors.name = '';
  submitted.value = false;
  activeMenu.value = null;
  showClientModal.value = true;
}

function closeClientModal() {
  showClientModal.value = false;
}

async function saveClient() {
  submitted.value = true;

  // Validate required fields
  validationErrors.name = '';
  if (!clientForm.value.name || !clientForm.value.name.trim()) {
    validationErrors.name = 'Client name is required.';
  }
  if (validationErrors.name) {
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (editingClient.value) {
      const updatedClient = await clientService.updateClient(editingClient.value.id, clientForm.value);
      const index = clients.value.findIndex(c => c.id === editingClient.value.id);
      if (index !== -1) {
        const projects = clients.value[index].projects || [];
        clients.value[index] = { ...updatedClient, projects };
      }
      toast.success('Client updated successfully');
    } else {
      const newClient = await clientService.createClient(clientForm.value);
      clients.value.push({ ...newClient, projects: [] });
      toast.success('Client added successfully');
    }
    closeClientModal();
  } catch (err) {
    error.value = 'Failed to save client. Please try again.';
    toast.error('Failed to save client');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteClient(client, event) {
  clientToDelete.value = client;
  activeMenu.value = null;
  showDeleteModal.value = true;
  if (event) event.stopPropagation();
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  clientToDelete.value = null;
}

async function deleteClient(event) {
  if (!clientToDelete.value) return;
  if (event) event.preventDefault();
  
  deleting.value = true;
  error.value = null;
  
  try {
    await clientService.deleteClient(clientToDelete.value.id);
    const index = clients.value.findIndex(c => c.id === clientToDelete.value.id);
    if (index !== -1) {
      clients.value.splice(index, 1);
    }
    toast.success('Client deleted successfully');
    closeDeleteModal();
  } catch (err) {
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

onMounted(async () => {
  await loadClients();
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

async function runContactMigration() {
  migratingContacts.value = true;
  try {
    const result = await clientStore.runContactMigration();
    if (result.success) {
      showMigrationButton.value = false;
      migrationSuccess.value = true;
      await loadClients();
    }
  } catch (err) {
    toast.error('Failed to run contact migration');
  } finally {
    migratingContacts.value = false;
  }
}

const filteredClients = computed(() => {
  if (!Array.isArray(clients.value)) return [];
  const safeClients = clients.value.filter(client => !client.clientId);
  if (!searchQuery.value) return safeClients;
  const query = searchQuery.value.toLowerCase();
  return safeClients.filter(client => 
    client.name.toLowerCase().includes(query) || 
    (client.industry && client.industry.toLowerCase().includes(query))
  );
});

</script>
