<template>
  <PageContainer>
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading client details...</p>
    </div>

    <div v-else-if="!client" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Client not found</p>
      <router-link to="/clients" class="btn btn-primary mt-4">Back to Clients</router-link>
    </div>

    <template v-else>
      <PageHeader
        :breadcrumbs="breadcrumbItems"
        backTo="/clients"
        :title="client.name"
        :subtitle="client.industry"
      >
        <template #actions>
          <router-link
            :to="`/clients/${client.id}/projects/new`"
            class="btn btn-primary"
          >
            Create Project
          </router-link>
          <button @click="editClient" class="btn btn-secondary">
            Edit Client
          </button>
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main content -->
        <div class="lg:col-span-2">
          <ClientInfoSection
            :website="client.website"
            :description="client.description"
            :project-count="clientProjects?.length || 0"
            :active-project-count="activeProjectsCount"
            class="mb-6"
          />

          <ClientProjectsTable
            :projects="filteredProjects"
            :client-id="client.id"
            v-model:search="projectSearch"
            v-model:status-filter="statusFilter"
            @edit="editProject"
            @delete="confirmDeleteProject"
          />
        </div>

        <!-- Sidebar -->
        <div>
          <ClientContactsSection
            :contacts="filteredContacts"
            :loading="contactsLoading"
            @add="openAddContactModal"
            @edit="editContact"
            @delete="confirmDeleteContact"
          />
        </div>
      </div>
    </template>

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
          <button type="submit" class="btn btn-primary" :disabled="savingContact">
            {{ savingContact ? 'Saving...' : 'Save Contact' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Delete Contact Confirmation Modal -->
    <Modal v-model="showDeleteContactModal" title="Confirm Delete Contact">
      <div v-if="contactToDelete" class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete contact "{{ contactToDelete.name }}"?
        </p>
        <div class="form-actions">
          <button type="button" @click="closeDeleteContactModal" class="btn btn-outline">Cancel</button>
          <button
            type="button"
            @click="deleteContact"
            class="btn btn-danger"
            :disabled="deletingContact"
          >
            {{ deletingContact ? 'Deleting...' : 'Delete Contact' }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Delete Project Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete">
      <div v-if="projectToDelete" class="space-y-4">
        <p class="text-gray-600 dark:text-gray-400">
          Are you sure you want to delete "{{ projectToDelete.name }}"? This action cannot be undone.
        </p>
        <div class="flex justify-end space-x-3">
          <button @click="closeDeleteModal" class="btn btn-secondary">
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
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import clientService from '@/services/client.service'
import projectService from '@/services/project.service'
import Modal from '@/components/Modal.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ClientInfoSection from '@/components/client/ClientInfoSection.vue'
import ClientContactsSection from '@/components/client/ClientContactsSection.vue'
import ClientProjectsTable from '@/components/client/ClientProjectsTable.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// State
const loading = ref(true)
const error = ref(null)
const client = ref(null)
const clientProjects = ref([])
const projectsLoading = ref(false)
const contactsLoading = ref(false)
const showClientModal = ref(false)
const showDeleteModal = ref(false)
const showContactModal = ref(false)
const showDeleteContactModal = ref(false)
const projectToDelete = ref(null)
const contactToDelete = ref(null)
const editingContact = ref(null)
const saving = ref(false)
const deleting = ref(false)
const savingContact = ref(false)
const deletingContact = ref(false)
const projectSearch = ref('')
const statusFilter = ref('')

const clientForm = ref({
  name: '',
  industry: '',
  website: '',
  description: ''
})

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  role: '',
  isPrimary: false,
  notes: ''
})

// Computed
const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Clients', to: '/clients' },
  { label: client.value?.name || 'Client' }
])

const activeProjectsCount = computed(() => {
  return clientProjects.value?.filter(p => p.status?.toLowerCase() === 'in progress').length || 0
})

const filteredProjects = computed(() => {
  if (!clientProjects.value) return []

  return clientProjects.value.filter(project => {
    const matchesSearch = projectSearch.value === '' ||
      project.name.toLowerCase().includes(projectSearch.value.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(projectSearch.value.toLowerCase()))

    const matchesStatus = statusFilter.value === '' || project.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const filteredContacts = computed(() => {
  if (!client.value || !client.value.contacts) {
    return []
  }

  return (client.value.contacts || []).filter(contact =>
    contact && (contact.name || contact.email || contact.phone)
  )
})

// Load client data
async function loadClient() {
  loading.value = true
  error.value = null

  try {
    const clientId = route.params.id
    client.value = await clientService.getClient(clientId)

    // Load projects for this client
    await loadClientProjects(clientId)

    // If contacts array doesn't exist yet, initialize it
    if (!client.value.contacts) {
      client.value.contacts = []
    }
  } catch (err) {
    console.error('Error loading client:', err)
    error.value = 'Failed to load client details. Please try again.'
  } finally {
    loading.value = false
  }
}

// Load client projects
async function loadClientProjects(clientId) {
  projectsLoading.value = true

  try {
    clientProjects.value = await projectService.getProjectsByClient(clientId)
  } catch (err) {
    console.error('Error loading client projects:', err)
    toast.error('Failed to load client projects')
  } finally {
    projectsLoading.value = false
  }
}

// Backward-compatible fallback for loading contacts
async function loadClientContacts(clientId) {
  if (client.value && client.value.contacts) {
    return
  }

  contactsLoading.value = true
  try {
    const response = await clientService.getClientContacts(clientId)

    if (!client.value.contacts) {
      client.value.contacts = []
    }

    if (Array.isArray(response) && response.length > 0) {
      client.value.contacts = response
    }
  } catch (err) {
    console.error('Error loading client contacts:', err)
    toast.error('Failed to load client contacts')
  } finally {
    contactsLoading.value = false
  }
}

// ── Client editing ──────────────────────────────────────────────────────

function editClient() {
  clientForm.value = {
    name: client.value.name,
    industry: client.value.industry || '',
    website: client.value.website || '',
    description: client.value.description || ''
  }
  showClientModal.value = true
}

function closeClientModal() {
  showClientModal.value = false
}

async function saveClient() {
  saving.value = true
  error.value = null

  try {
    const updatedClient = await clientService.updateClient(client.value.id, clientForm.value)
    client.value = updatedClient
    toast.success('Client updated successfully')
    closeClientModal()
  } catch (err) {
    console.error('Error saving client:', err)
    error.value = 'Failed to update client. Please try again.'
    toast.error('Failed to update client')
  } finally {
    saving.value = false
  }
}

// ── Project actions ─────────────────────────────────────────────────────

function editProject(project) {
  router.push(`/projects/${project.id}/edit`)
}

function confirmDeleteProject(project) {
  projectToDelete.value = project
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  projectToDelete.value = null
}

async function deleteProject() {
  if (!projectToDelete.value) return

  deleting.value = true
  error.value = null

  try {
    await projectService.deleteProject(projectToDelete.value.id)

    const index = clientProjects.value.findIndex(p => p.id === projectToDelete.value.id)
    if (index !== -1) {
      clientProjects.value.splice(index, 1)
    }

    toast.success('Project deleted successfully')
    closeDeleteModal()
  } catch (err) {
    console.error('Error deleting project:', err)
    error.value = 'Failed to delete project. Please try again.'
    toast.error('Failed to delete project')
  } finally {
    deleting.value = false
  }
}

// ── Contact actions ─────────────────────────────────────────────────────

function openAddContactModal() {
  editingContact.value = null
  contactForm.value = {
    name: '',
    email: '',
    phone: '',
    role: '',
    isPrimary: client.value.contacts.length === 0,
    notes: ''
  }
  showContactModal.value = true
}

function editContact(contact) {
  editingContact.value = contact
  contactForm.value = { ...contact }
  showContactModal.value = true
}

function closeContactModal() {
  showContactModal.value = false
  editingContact.value = null
}

async function saveContact() {
  savingContact.value = true
  try {
    const clientId = client.value.id
    const clientToUpdate = { ...client.value }

    if (editingContact.value) {
      const contactIndex = clientToUpdate.contacts.findIndex(c => c.id === editingContact.value.id)
      if (contactIndex !== -1) {
        clientToUpdate.contacts[contactIndex] = {
          ...editingContact.value,
          ...contactForm.value
        }
      }
    } else {
      if (!clientToUpdate.contacts) {
        clientToUpdate.contacts = []
      }

      const newContact = {
        ...contactForm.value,
        id: `contact_${Date.now()}`,
        createdAt: new Date().toISOString()
      }

      clientToUpdate.contacts.push(newContact)
    }

    const updatedClient = await clientService.updateClient(clientId, clientToUpdate)
    client.value = updatedClient

    toast.success(editingContact.value ? 'Contact updated' : 'Contact added')
    closeContactModal()
  } catch (err) {
    if (!err.silentError) {
      console.error('Error saving contact:', err)
      toast.error('Failed to save contact')
    } else {
      toast.success(editingContact.value ? 'Contact updated' : 'Contact added')
      closeContactModal()
      await loadClient()
    }
  } finally {
    savingContact.value = false
  }
}

function confirmDeleteContact(contact) {
  contactToDelete.value = contact
  showDeleteContactModal.value = true
}

function closeDeleteContactModal() {
  showDeleteContactModal.value = false
  contactToDelete.value = null
}

async function deleteContact() {
  if (!contactToDelete.value) return
  deletingContact.value = true

  try {
    console.log('Deleting contact', contactToDelete.value.id, 'from client', client.value.id)

    const clientToUpdate = { ...client.value }
    clientToUpdate.contacts = clientToUpdate.contacts.filter(
      c => c.id !== contactToDelete.value.id
    )

    const updatedClient = await clientService.updateClient(client.value.id, clientToUpdate)
    client.value = updatedClient

    toast.success('Contact deleted')
    closeDeleteContactModal()
  } catch (err) {
    if (!err.silentError) {
      console.error('Error deleting contact:', err)
      toast.error('Failed to delete contact')
    } else {
      toast.success('Contact deleted')
      closeDeleteContactModal()
      await loadClient()
    }
  } finally {
    deletingContact.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadClient()
})
</script>
