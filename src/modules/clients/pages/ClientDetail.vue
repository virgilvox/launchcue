<template>
  <PageContainer>
    <div v-if="loading" class="text-center py-10">
      <LoadingSpinner text="Loading client details..." />
    </div>

    <div v-else-if="!client" class="text-center py-10">
      <p class="text-[var(--text-secondary)]">Client not found</p>
      <router-link to="/clients" class="btn btn-primary mt-4">Back to Clients</router-link>
    </div>

    <template v-else>
      <PageHeader
        :breadcrumbs="breadcrumbItems"
        backTo="/clients"
        :title="client.name"
        :subtitle="client.industry"
      >
        <template #title-prefix>
          <ClientColorDot :color="client.color" variant="dot" class="w-4 h-4" />
        </template>
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
        <div class="space-y-6">
          <ClientContactsSection
            :contacts="filteredContacts"
            :loading="contactsLoading"
            @add="openAddContactModal"
            @edit="editContact"
            @delete="confirmDeleteContact"
          />

          <ClientInvitationsSection
            :client-id="client.id"
            :client-name="client.name"
            :invitations="clientInvitations"
            :loading="invitationsLoading"
            @invitation-created="loadInvitations"
            @delete-invitation="revokeInvitation"
          />
        </div>
      </div>
    </template>

    <!-- Edit Client Modal -->
    <Modal v-model="showClientModal" title="Edit Client" size="sm">
      <form @submit.prevent="saveClient" class="space-y-4">
        <div>
          <label for="clientName" class="label">Client Name</label>
          <input
            id="clientName"
            v-model="clientForm.name"
            type="text"
            class="input"
            placeholder="Client name"
            maxlength="200"
            required
          />
        </div>

        <div>
          <label for="clientIndustry" class="label">Industry</label>
          <input
            id="clientIndustry"
            v-model="clientForm.industry"
            type="text"
            class="input"
            placeholder="Industry"
          />
        </div>

        <div>
          <label for="clientWebsite" class="label">Website</label>
          <input
            id="clientWebsite"
            v-model="clientForm.website"
            type="url"
            class="input"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label for="clientDescription" class="label">Description</label>
          <textarea
            id="clientDescription"
            v-model="clientForm.description"
            class="input"
            placeholder="Client description"
            rows="3"
            maxlength="2000"
          ></textarea>
        </div>

        <div>
          <ClientColorPicker v-model="clientForm.color" />
        </div>

        <div class="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
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
    </Modal>

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
            <input id="contactEmail" v-model="contactForm.email" type="email" class="input" :class="{ 'border-[var(--danger)]': contactForm.email && !isValidEmail(contactForm.email) }" />
            <p v-if="contactForm.email && !isValidEmail(contactForm.email)" class="text-xs text-[var(--danger)] mt-1">
              Please enter a valid email address
            </p>
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
        <div class="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
          <button type="button" @click="closeContactModal" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="savingContact || (contactForm.email && !isValidEmail(contactForm.email))">
            {{ savingContact ? 'Saving...' : 'Save Contact' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Delete Contact Confirmation Modal -->
    <Modal v-model="showDeleteContactModal" title="Confirm Delete Contact">
      <div v-if="contactToDelete" class="space-y-4">
        <p class="text-[var(--text-primary)]">
          Are you sure you want to delete contact "{{ contactToDelete.name }}"?
        </p>
        <div class="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
          <button type="button" @click="closeDeleteContactModal" class="btn btn-secondary">Cancel</button>
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
        <p class="text-[var(--text-secondary)]">
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
import { useClientStore } from '@/stores/client'
import { useProjectStore } from '@/stores/project'
import Modal from '@/components/Modal.vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ClientInfoSection from '@/modules/clients/components/ClientInfoSection.vue'
import ClientContactsSection from '@/modules/clients/components/ClientContactsSection.vue'
import ClientProjectsTable from '@/modules/clients/components/ClientProjectsTable.vue'
import ClientColorDot from '@/components/ui/ClientColorDot.vue'
import ClientColorPicker from '@/components/ui/ClientColorPicker.vue'
import ClientInvitationsSection from '@/modules/clients/components/ClientInvitationsSection.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const clientStore = useClientStore()
const projectStore = useProjectStore()

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
const clientInvitations = ref([])
const invitationsLoading = ref(false)

const clientForm = ref({
  name: '',
  industry: '',
  website: '',
  description: '',
  color: 'slate'
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
      (project.title || '').toLowerCase().includes(projectSearch.value.toLowerCase()) ||
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
    const result = await clientStore.getClient(clientId)
    if (result.success) {
      client.value = result.client
    } else {
      throw new Error(result.error || 'Failed to load client')
    }

    // Ensure contacts are loaded (getClient may return a cached version without the join)
    if (!client.value.contacts) {
      const contactsResult = await clientStore.getClientContacts(clientId)
      if (contactsResult.success) {
        client.value.contacts = contactsResult.contacts || []
      }
    }

    // Load projects and invitations for this client
    await Promise.all([
      loadClientProjects(clientId),
      loadInvitations(),
    ])

    // If contacts array doesn't exist yet, initialize it
    if (!client.value.contacts) {
      client.value.contacts = []
    }
  } catch (err) {
    error.value = 'Failed to load client details. Please try again.'
  } finally {
    loading.value = false
  }
}

// Load client projects
async function loadClientProjects(clientId) {
  projectsLoading.value = true

  try {
    const result = await clientStore.getClientProjects(clientId)
    if (result.success) {
      clientProjects.value = result.projects || []
    } else {
      throw new Error(result.error || 'Failed to load projects')
    }
  } catch (err) {
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
    const result = await clientStore.getClientContacts(clientId)

    if (!client.value.contacts) {
      client.value.contacts = []
    }

    if (result.success && Array.isArray(result.contacts) && result.contacts.length > 0) {
      client.value.contacts = result.contacts
    }
  } catch (err) {
    toast.error('Failed to load client contacts')
  } finally {
    contactsLoading.value = false
  }
}

// ── Invitations ─────────────────────────────────────────────────────────

async function loadInvitations() {
  const clientId = route.params.id
  invitationsLoading.value = true
  try {
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()
    const { data, error: err } = await sb
      .from('active_client_invitations')
      .select('id, email, name, status, expires_at, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (err) throw err
    clientInvitations.value = (data || []).map(inv => ({
      id: inv.id,
      email: inv.email,
      name: inv.name,
      status: new Date(inv.expires_at) < new Date() && inv.status === 'pending' ? 'expired' : inv.status,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }))
  } catch {
    // Non-critical — don't block the page
    clientInvitations.value = []
  } finally {
    invitationsLoading.value = false
  }
}

async function revokeInvitation(invitationId) {
  try {
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()
    const { error: err } = await sb
      .from('client_invitations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', invitationId)
    if (err) throw err
    toast.success('Invitation revoked')
    await loadInvitations()
  } catch {
    toast.error('Failed to revoke invitation')
  }
}

// ── Client editing ──────────────────────────────────────────────────────

function editClient() {
  clientForm.value = {
    name: client.value.name,
    industry: client.value.industry || '',
    website: client.value.website || '',
    description: client.value.description || '',
    color: client.value.color || 'slate'
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
    const result = await clientStore.updateClient(client.value.id, clientForm.value)
    if (result.success) {
      client.value = result.client
    }
    closeClientModal()
  } catch (err) {
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
    await projectStore.deleteProject(projectToDelete.value.id)

    const index = clientProjects.value.findIndex(p => p.id === projectToDelete.value.id)
    if (index !== -1) {
      clientProjects.value.splice(index, 1)
    }

    toast.success('Project deleted successfully')
    closeDeleteModal()
  } catch (err) {
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

function isValidEmail(email) {
  if (!email) return true // empty is ok, it's optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function saveContact() {
  // Validate email before submitting
  if (!isValidEmail(contactForm.value.email)) {
    toast.error('Please enter a valid email address')
    return
  }

  savingContact.value = true
  try {
    const clientId = client.value.id
    const { getSupabase } = await import('@/adapters/supabase/client')
    const sb = getSupabase()

    // Normalize empty strings to null for optional fields
    const payload = {
      name: contactForm.value.name,
      email: contactForm.value.email || null,
      phone: contactForm.value.phone || null,
      role: contactForm.value.role || null,
      is_primary: contactForm.value.isPrimary || false,
      notes: contactForm.value.notes || null,
    }

    if (editingContact.value) {
      const { error: updateErr } = await sb
        .from('client_contacts')
        .update(payload)
        .eq('id', editingContact.value.id)
      if (updateErr) throw updateErr
    } else {
      const { error: insertErr } = await sb
        .from('client_contacts')
        .insert({ client_id: clientId, ...payload })
      if (insertErr) throw insertErr
    }

    toast.success(editingContact.value ? 'Contact updated' : 'Contact added')
    closeContactModal()
    // Reload client to get updated contacts
    await loadClient()
  } catch (err) {
    toast.error('Failed to save contact')
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
    const sb = (await import('@/adapters/supabase/client')).getSupabase()
    const { error: deleteErr } = await sb
      .from('client_contacts')
      .delete()
      .eq('id', contactToDelete.value.id)
    if (deleteErr) throw deleteErr

    // Reload client to get updated contacts
    await loadClient()
    toast.success('Contact deleted')
    closeDeleteContactModal()
  } catch (err) {
    toast.error('Failed to delete contact')
  } finally {
    deletingContact.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadClient()
})
</script>
