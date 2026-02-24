<template>
  <div>
    <PageHeader title="Projects">
      <template #actions>
        <button @click="openAddProjectModal" class="btn btn-primary">
          <PlusIcon class="h-4 w-4 mr-2" />
          ADD PROJECT
        </button>
      </template>
    </PageHeader>
    
    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <LoadingSpinner text="Loading projects..." />
    </div>
    
    <!-- Empty State -->
    <EmptyState
      v-else-if="projects.length === 0"
      :icon="BriefcaseIcon"
      title="No projects yet"
      description="Projects organize deliverables by client. Track deadlines, assign tasks, measure progress."
      actionLabel="ADD PROJECT"
      @action="openAddProjectModal"
    />
    
    <div v-else>
      <!-- Filters -->
      <div class="mb-6 card">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label for="statusFilter" class="label">STATUS</label>
            <select id="statusFilter" v-model="filters.status" class="input">
              <option value="">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
          
          <div>
            <label for="clientFilter" class="label">CLIENT</label>
            <select id="clientFilter" v-model="filters.clientId" class="input">
              <option value="">All Clients</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>
          
          <div>
            <label for="searchFilter" class="label">SEARCH</label>
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
          class="card card-interactive"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="heading-card">{{ project.name || project.title }}</h3>
            <div class="relative">
              <button @click="toggleProjectMenu(project.id)" class="btn-icon">
                <EllipsisVerticalIcon class="h-5 w-5" />
              </button>
              
              <div v-if="activeMenu === project.id" class="absolute right-0 mt-1 w-48 bg-[var(--surface-elevated)] border-2 border-[var(--border)] shadow-brutal-sm z-10 py-1">
                <button 
                  @click="openEditProjectModal(project)"
                  class="block w-full text-left px-4 py-2 text-body-sm hover:bg-[var(--surface)]"
                >
                  Edit Project
                </button>
                <router-link 
                  :to="`/projects/${project.id}`"
                  class="block w-full text-left px-4 py-2 text-body-sm hover:bg-[var(--surface)]"
                >
                  View Details
                </router-link>
                <button 
                  @click="confirmDeleteProject(project)"
                  class="block w-full text-left px-4 py-2 text-body-sm text-[var(--danger)] hover:bg-[var(--accent-primary-wash)]"
                >
                  Delete Project
                </button>
              </div>
            </div>
          </div>
          
          <span :class="['badge mb-3', getStatusColor(project.status)]">
            {{ project.status }}
          </span>
          
          <p class="text-body mb-4">{{ project.description }}</p>
          
          <div class="text-body-sm mb-3 flex items-center gap-2">
            <span class="overline">CLIENT</span>
            <ClientColorDot :color="getClientColorId(project.clientId)" />
            <span>{{ getClientName(project.clientId) }}</span>
          </div>
          
          <div class="flex flex-wrap mb-4 gap-1">
            <span 
              v-for="tag in project.tags" 
              :key="tag"
              class="badge badge-gray"
            >
              {{ tag }}
            </span>
          </div>
          
          <div class="border-t-2 border-[var(--border-light)] pt-4 flex justify-between items-center">
            <div class="mono text-body-sm text-[var(--text-secondary)]">
              <div>Start: {{ formatDate(project.startDate) }}</div>
              <div>Due: {{ formatDate(project.dueDate) }}</div>
            </div>
            
            <router-link :to="`/projects/${project.id}`" class="btn btn-sm btn-outline">
              VIEW
            </router-link>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Project Modal -->
    <Modal v-model="showModal" :title="editingProject ? 'Edit Project' : 'Add Project'">
      <form @submit.prevent="saveProject" class="space-y-4">
        <div class="form-group">
          <label for="projectTitle" class="label">PROJECT TITLE</label>
          <input 
            id="projectTitle"
            v-model="projectForm.title"
            type="text"
            class="input"
            placeholder="Website Redesign"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="projectDescription" class="label">DESCRIPTION</label>
          <textarea 
            id="projectDescription"
            v-model="projectForm.description"
            class="form-textarea"
            placeholder="Project description"
            rows="3"
          ></textarea>
        </div>
        
        <div class="form-group">
          <label for="projectClient" class="label">CLIENT</label>
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
        
        <div class="form-group">
          <label for="projectTags" class="label">TAGS (COMMA SEPARATED)</label>
          <input 
            id="projectTags"
            v-model="projectTagsInput"
            type="text"
            class="input"
            placeholder="web, design, documentation"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="form-group">
            <label for="projectStartDate" class="label">START DATE</label>
            <input 
              id="projectStartDate"
              v-model="projectForm.startDate"
              type="date"
              class="input"
            />
          </div>
          
          <div class="form-group">
            <label for="projectDeadline" class="label">DEADLINE</label>
            <input 
              id="projectDeadline"
              v-model="projectForm.dueDate"
              type="date"
              class="input"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="projectStatus" class="label">STATUS</label>
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
        
        <div class="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border-light)]">
          <button type="button" @click="closeModal" class="btn btn-secondary">
            CANCEL
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'SAVING...' : 'SAVE PROJECT' }}
          </button>
        </div>
      </form>
    </Modal>
    
    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete" size="sm">
      <div class="space-y-4">
        <p>Are you sure you want to delete <strong>{{ projectToDelete?.title }}</strong>? This action cannot be undone.</p>
        
        <div class="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border-light)]">
          <button @click="closeDeleteModal" class="btn btn-secondary">
            CANCEL
          </button>
          <button @click="deleteProject" class="btn btn-danger" :disabled="deleting">
            {{ deleting ? 'DELETING...' : 'DELETE PROJECT' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useProjectStore } from '../stores/project';
import { useClientStore } from '../stores/client';
import { getStatusColor } from '@/utils/statusColors';
import { formatDate } from '@/utils/dateFormatter';
import { useEntityLookup } from '@/composables/useEntityLookup';
import { PlusIcon, BriefcaseIcon, EllipsisVerticalIcon } from '@heroicons/vue/24/outline';
import Modal from '../components/Modal.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import ClientColorDot from '../components/ui/ClientColorDot.vue';

const projectStore = useProjectStore();
const clientStore = useClientStore();
const { getClientName, getClientColorId } = useEntityLookup();

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
  if (!Array.isArray(projects.value)) return [];
  
  return projects.value.filter(project => {
    if (filters.value.status && project.status !== filters.value.status) {
      return false;
    }
    
    if (filters.value.clientId && project.clientId !== filters.value.clientId) {
      return false;
    }
    
    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      const matchesTitle = project.title.toLowerCase().includes(searchTerm);
      const matchesDescription = project.description?.toLowerCase().includes(searchTerm) || false;
      const matchesTags = Array.isArray(project.tags) && 
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (!matchesTitle && !matchesDescription && !matchesTags) {
        return false;
      }
    }
    
    return true;
  });
});

onMounted(async () => {
  loading.value = true;
  // Fetch in parallel; allSettled ensures one failure doesn't block the other
  const results = await Promise.allSettled([
    projectStore.fetchProjects(),
    clientStore.fetchClients(),
  ]);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Projects dependency fetch #${i} failed:`, result.reason);
    }
  });
  loading.value = false;
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});

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

function openAddProjectModal() {
  editingProject.value = null;
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
  
  let formattedDueDate = '';
  let formattedStartDate = '';
  
  if (project.dueDate) {
    const date = new Date(project.dueDate);
    formattedDueDate = date.toISOString().split('T')[0];
  }
  
  if (project.startDate) {
    const date = new Date(project.startDate);
    formattedStartDate = date.toISOString().split('T')[0];
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
    const formattedProject = {
      ...projectForm.value
    };
    
    if (formattedProject.startDate) {
      formattedProject.startDate = new Date(formattedProject.startDate).toISOString();
    }
    
    if (formattedProject.dueDate) {
      formattedProject.dueDate = new Date(formattedProject.dueDate).toISOString();
    }
    
    if (editingProject.value) {
      await projectStore.updateProject(editingProject.value.id, formattedProject);
    } else {
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
