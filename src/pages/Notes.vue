<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Notes</h2>
      <button @click="openAddNoteModal" class="btn btn-primary">
        Add Note
      </button>
    </div>
    
    <!-- Filters -->
    <div class="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         <!-- Client Filter -->
          <div>
              <label for="clientFilter" class="label text-xs">Filter by Client</label>
              <select id="clientFilter" v-model="filters.clientId" class="input text-sm">
                  <option :value="null">All Clients</option>
                  <option v-for="client in clients" :key="client.id" :value="client.id">
                      {{ client.name }}
                  </option>
              </select>
          </div>
           <!-- Project Filter -->
          <div>
              <label for="projectFilter" class="label text-xs">Filter by Project</label>
              <select id="projectFilter" v-model="filters.projectId" class="input text-sm" :disabled="loadingProjects">
                  <option :value="null">All Projects</option>
                  <!-- Filter projects based on selected client -->
                   <option v-for="project in availableProjects" :key="project.id" :value="project.id">
                      {{ project.title }}
                  </option>
              </select>
          </div>
           <!-- Tag Filter -->
          <div>
             <label for="tagFilter" class="label text-xs">Filter by Tags (comma-sep)</label>
             <input 
                id="tagFilter"
                v-model="filters.tags"
                type="text" 
                class="input text-sm" 
                placeholder="e.g., meeting, summary"
             />
          </div>
      </div>
    </div>
    
    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading notes..." />
    </div>
    
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500">{{ error }}</p>
    </div>
    
    <div v-else-if="filteredNotes.length === 0" class="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-gray-500 dark:text-gray-400">No notes found matching your criteria.</p>
       <button @click="clearFilters" v-if="hasActiveFilters" class="text-primary-600 dark:text-primary-400 hover:underline mt-2">
          Clear Filters
      </button>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="note in filteredNotes" 
        :key="note.id"
        class="card hover:shadow-lg transition-shadow flex flex-col"
      >
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white flex-1 mr-2 break-words">{{ note.title }}</h3>
          <!-- Note Actions Menu -->
          <div class="relative flex-shrink-0">
            <button @click="toggleNoteMenu(note.id)" class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>
            <div v-if="activeMenu === note.id" @click.stop class="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20 py-1 border dark:border-gray-600">
              <button @click="editNote(note)" class="context-menu-item">Edit Note</button>
              <button @click="confirmDeleteNote(note)" class="context-menu-item text-red-600 dark:text-red-400">Delete Note</button>
            </div>
          </div>
        </div>
        
        <!-- Content Preview -->
        <div class="prose prose-sm dark:prose-invert mb-4 flex-grow max-h-48 overflow-hidden relative">
          <div v-html="renderMarkdown(note.content)"></div>
           <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none"></div> <!-- Fade out effect -->
        </div>
        
        <!-- Tags and Metadata -->
         <div class="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
            <div v-if="note.tags && note.tags.length > 0" class="flex flex-wrap gap-1 mb-2">
                 <span v-for="tag in note.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
                 <span v-if="note.clientId">Client: {{ getClientName(note.clientId) }}</span>
                 <span v-if="note.clientId && note.projectId"> • </span>
                 <span v-if="note.projectId">Project: {{ getProjectName(note.projectId) }}</span>
                 <span v-if="!note.clientId && !note.projectId">No associated client/project</span>
                 <br> Created: {{ formatDate(note.createdAt) }}
            </div>
         </div>
      </div>
    </div>
    
    <!-- Add/Edit Note Modal -->
    <Modal v-model="showNoteModal" :title="editingNote ? 'Edit Note' : 'Add Note'">
        <form @submit.prevent="saveNote" class="space-y-4">
             <div class="form-group">
                <label for="noteTitle" class="label">Title *</label>
                <input id="noteTitle" v-model="noteForm.title" type="text" class="input" required />
            </div>
             <div class="form-group">
                <label for="noteContent" class="label">Content (Markdown) *</label>
                <textarea id="noteContent" v-model="noteForm.content" rows="10" class="input font-mono" required></textarea>
            </div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div class="form-group">
                    <label for="noteClient" class="label">Link to Client (Optional)</label>
                    <select id="noteClient" v-model="noteForm.clientId" class="input text-sm">
                        <option :value="null">-- Select Client --</option>
                        <option v-for="client in clients" :key="client.id" :value="client.id">{{ client.name }}</option>
                    </select>
                 </div>
                  <div class="form-group">
                    <label for="noteProject" class="label">Link to Project (Optional)</label>
                    <select id="noteProject" v-model="noteForm.projectId" class="input text-sm" :disabled="!noteForm.clientId">
                         <option :value="null">-- Select Project --</option>
                         <option v-for="project in projectsForSelectedClient" :key="project.id" :value="project.id">{{ project.title }}</option>
                    </select>
                 </div>
             </div>
             <div class="form-group">
                <label for="noteTags" class="label">Tags (comma separated)</label>
                <input id="noteTags" v-model="noteForm.tags" type="text" class="input" placeholder="e.g., meeting, summary" />
            </div>
            <div class="form-actions">
                <button type="button" @click="closeNoteModal" class="btn btn-outline">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Save Note' }}</button>
            </div>
        </form>
    </Modal>
    
    <!-- Delete Note Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete Note">
         <div v-if="noteToDelete" class="space-y-4">
            <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete note "{{ noteToDelete.title }}"?</p>
            <div class="form-actions">
                <button type="button" @click="closeDeleteModal" class="btn btn-outline">Cancel</button>
                <button type="button" @click="deleteNote" class="btn btn-danger" :disabled="deleting">{{ deleting ? 'Deleting...' : 'Delete Note' }}</button>
            </div>
        </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useAuthStore } from '../stores/auth';
import noteService from '../services/note.service'; // Corrected path
import { useClientStore } from '../stores/client';
import { useProjectStore } from '../stores/project';
import { useToast } from 'vue-toastification';
import Modal from '../components/Modal.vue';
import LoadingSpinner from '../components/LoadingSpinner.vue';

const authStore = useAuthStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();
const toast = useToast();

const loading = ref(false);
const loadingClients = ref(false);
const loadingProjects = ref(false);
const error = ref(null);
const notes = ref([]);
const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);
const activeMenu = ref(null);
const showNoteModal = ref(false);
const showDeleteModal = ref(false);
const editingNote = ref(null);
const noteToDelete = ref(null);
const saving = ref(false);
const deleting = ref(false);

// Filters state
const filters = ref({
    clientId: null,
    projectId: null,
    tags: '' // Comma-separated string for filtering
});

const noteForm = ref({
  title: '',
  content: '',
  tags: '', // Keep as string for input binding
  clientId: null,
  projectId: null
});

// --- Computed Properties ---

// Filter projects based on client selected in the *modal form*
const projectsForSelectedClient = computed(() => {
    if (!noteForm.value.clientId) return [];
    return projects.value.filter(p => p.clientId === noteForm.value.clientId);
});

// Filter available projects for the *main filter dropdown*
const availableProjects = computed(() => {
    if (!filters.value.clientId) return projects.value; // Show all if no client filter
    return projects.value.filter(p => p.clientId === filters.value.clientId);
});

// Filter notes based on UI filters
const filteredNotes = computed(() => {
    const filterClientId = filters.value.clientId;
    const filterProjectId = filters.value.projectId;
    const filterTags = filters.value.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== '');

    return notes.value.filter(note => {
        const clientMatch = !filterClientId || note.clientId === filterClientId;
        const projectMatch = !filterProjectId || note.projectId === filterProjectId;
        const tagsMatch = filterTags.length === 0 || 
            (note.tags && note.tags.some(noteTag => filterTags.includes(noteTag.toLowerCase())));
            // Alternative: Check if note.tags includes *all* filterTags
            // filterTags.every(ft => note.tags?.some(nt => nt.toLowerCase() === ft))

        return clientMatch && projectMatch && tagsMatch;
    });
});

// Check if any filters are active
const hasActiveFilters = computed(() => {
    return filters.value.clientId || filters.value.projectId || filters.value.tags.trim() !== '';
});

// --- Methods ---

async function loadDependencies() {
    loadingClients.value = true;
    loadingProjects.value = true;
    try {
        await Promise.all([
            clientStore.fetchClients(),
            projectStore.fetchProjects()
        ]);
    } catch (err) {
        console.error("Failed to load clients/projects for filtering", err);
        toast.error("Could not load filter options.");
    } finally {
        loadingClients.value = false;
        loadingProjects.value = false;
    }
}

async function loadNotes() {
  loading.value = true;
  error.value = null;
  try {
    // Fetch all notes for the team
    notes.value = await noteService.getNotes(); 
  } catch (err) {
    console.error('Error loading notes:', err);
    error.value = 'Failed to load notes. Please try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

function renderMarkdown(content) {
  if (!content) return '';
  // Ensure DOMPurify runs after marked
  const rawHtml = marked.parse(content);
  return DOMPurify.sanitize(rawHtml);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getClientName(clientId) {
    const client = clients.value.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
}

function getProjectName(projectId) {
    const project = projects.value.find(p => p.id === projectId);
    return project ? project.title : 'Unknown';
}

function clearFilters() {
    filters.value = { clientId: null, projectId: null, tags: '' };
}

function toggleNoteMenu(noteId) {
  if (activeMenu.value === noteId) {
    activeMenu.value = null;
  } else {
    activeMenu.value = noteId;
  }
}

function openAddNoteModal() {
  editingNote.value = null;
  noteForm.value = {
    title: '',
    content: '# ',
    tags: '',
    clientId: null,
    projectId: null
  };
  showNoteModal.value = true;
}

function editNote(note) {
  editingNote.value = note;
  noteForm.value = {
    title: note.title,
    content: note.content,
    tags: note.tags ? note.tags.join(', ') : '',
    clientId: note.clientId || null,
    projectId: note.projectId || null
  };
  activeMenu.value = null;
  showNoteModal.value = true;
}

function closeNoteModal() {
  showNoteModal.value = false;
}

async function saveNote() {
  saving.value = true;
  try {
    const tagsArray = noteForm.value.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    const noteData = { 
        ...noteForm.value, 
        tags: tagsArray,
        // Ensure null values are passed if empty, not empty strings
        clientId: noteForm.value.clientId || null,
        projectId: noteForm.value.projectId || null,
    };
    
    if (editingNote.value) {
      const updatedNote = await noteService.updateNote(editingNote.value.id, noteData);
      const index = notes.value.findIndex(n => n.id === editingNote.value.id);
      if (index !== -1) {
        notes.value.splice(index, 1, updatedNote);
      }
       toast.success('Note updated');
    } else {
      const newNote = await noteService.createNote(noteData);
      notes.value.unshift(newNote); // Add to start of list
      toast.success('Note added');
    }
    closeNoteModal();
  } catch (err) {
    console.error('Error saving note:', err);
    toast.error(`Failed to save note: ${err.message || 'Unknown error'}`);
  } finally {
    saving.value = false;
  }
}

function confirmDeleteNote(note) {
  noteToDelete.value = note;
  activeMenu.value = null;
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
  noteToDelete.value = null;
}

async function deleteNote() {
  if (!noteToDelete.value) return;
  
  deleting.value = true;
  
  try {
    await noteService.deleteNote(noteToDelete.value.id);
    
    const index = notes.value.findIndex(n => n.id === noteToDelete.value.id);
    if (index !== -1) {
      notes.value.splice(index, 1);
    }
    
    closeDeleteModal();
  } catch (err) {
    console.error('Error deleting note:', err);
    alert('Failed to delete note. Please try again.');
  } finally {
    deleting.value = false;
  }
}

function handleOutsideClick(event) {
  if (activeMenu.value && !event.target.closest('.relative')) {
    activeMenu.value = null;
  }
}

// Watch clientId in filter to reset projectId filter
watch(() => filters.value.clientId, () => {
    filters.value.projectId = null;
});

// Watch clientId in modal form to reset projectId
watch(() => noteForm.value.clientId, () => {
    noteForm.value.projectId = null;
});

onMounted(async () => {
  await loadDependencies(); // Load clients/projects first
  await loadNotes(); // Then load notes
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.card {
    @apply bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow flex flex-col;
}
.context-menu-item {
    @apply block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600;
}
.tag {
    @apply inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 