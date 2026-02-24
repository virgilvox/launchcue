<template>
  <PageContainer>
    <PageHeader title="Scopes" :breadcrumbs="breadcrumbs">
      <template #actions>
        <button @click="router.push('/scopes/new')" class="btn btn-primary">New Scope</button>
        <button @click="router.push('/scope-templates/new')" class="btn btn-secondary">New Template</button>
      </template>
    </PageHeader>

    <!-- Tab Switcher -->
    <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'scopes'"
          :class="[
            'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'scopes'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          ]"
        >
          Project Scopes
        </button>
        <button
          @click="activeTab = 'templates'"
          :class="[
            'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'templates'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          ]"
        >
          Templates
        </button>
      </nav>
    </div>

    <!-- Project Scopes Tab -->
    <div v-if="activeTab === 'scopes'">
      <!-- Filters -->
      <div class="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div class="flex flex-wrap gap-4">
          <div>
            <label for="statusFilter" class="label text-xs">Status</label>
            <select id="statusFilter" v-model="statusFilter" class="input text-sm">
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="approved">Approved</option>
              <option value="revised">Revised</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label for="clientFilter" class="label text-xs">Client</label>
            <select id="clientFilter" v-model="clientFilter" class="input text-sm">
              <option value="">All Clients</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        :columns="scopeColumns"
        :data="filteredScopes"
        :clickable="true"
        empty-title="No scopes found"
        empty-description="Create your first scope to get started."
        @row-click="row => router.push(`/scopes/${row.id}`)"
      >
        <template #cell-status="{ value }">
          <span
            class="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            :class="getStatusColor(value)"
          >
            {{ value }}
          </span>
        </template>
        <template #cell-totalAmount="{ value }">
          {{ formatCurrency(value || 0) }}
        </template>
        <template #cell-clientId="{ row }">
          {{ getClientName(row.clientId) }}
        </template>
        <template #cell-projectId="{ row }">
          {{ getProjectName(row.projectId) }}
        </template>
        <template #actions="{ row }">
          <button
            @click.stop="confirmDelete(row, 'scope')"
            class="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </template>
      </DataTable>
    </div>

    <!-- Templates Tab -->
    <div v-if="activeTab === 'templates'">
      <DataTable
        :columns="templateColumns"
        :data="templates"
        :clickable="true"
        empty-title="No templates found"
        empty-description="Create a reusable scope template to speed up your workflow."
        @row-click="row => router.push(`/scope-templates/${row.id}`)"
      >
        <template #cell-deliverables="{ value }">
          {{ value?.length || 0 }} deliverables
        </template>
        <template #cell-tags="{ value }">
          <span
            v-for="tag in (value || [])"
            :key="tag"
            class="inline-block bg-gray-100 dark:bg-gray-700 text-xs px-2 py-0.5 rounded mr-1"
          >
            {{ tag }}
          </span>
        </template>
        <template #actions="{ row }">
          <button
            @click.stop="createFromTemplate(row)"
            class="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm mr-3"
          >
            Use
          </button>
          <button
            @click.stop="confirmDelete(row, 'template')"
            class="text-red-500 hover:text-red-700 text-sm"
          >
            Delete
          </button>
        </template>
      </DataTable>
    </div>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete">
      <p class="text-gray-600 dark:text-gray-400">
        Are you sure you want to delete
        <span class="font-medium">{{ itemToDelete?.title }}</span>?
        This action cannot be undone.
      </p>
      <template #footer>
        <button
          @click="showDeleteModal = false"
          class="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          @click="performDelete"
          class="btn btn-danger"
          :disabled="deleting"
        >
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
      </template>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useScopeStore } from '@/stores/scope';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import { getStatusColor } from '@/utils/statusColors';
import { formatCurrency } from '@/utils/formatters';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import DataTable from '@/components/ui/DataTable.vue';
import Modal from '@/components/Modal.vue';

const router = useRouter();
const toast = useToast();
const scopeStore = useScopeStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Scopes' }
];

// Tab state
const activeTab = ref('scopes');

// Filter state
const statusFilter = ref('');
const clientFilter = ref('');

// Delete state
const showDeleteModal = ref(false);
const itemToDelete = ref(null);
const deleteType = ref('');
const deleting = ref(false);

// Store data
const scopes = computed(() => scopeStore.scopes || []);
const templates = computed(() => scopeStore.templates || []);
const clients = computed(() => clientStore.clients || []);
const projects = computed(() => projectStore.projects || []);

// Column definitions
const scopeColumns = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'clientId', label: 'Client' },
  { key: 'projectId', label: 'Project' },
  { key: 'totalAmount', label: 'Amount', sortable: true }
];

const templateColumns = [
  { key: 'title', label: 'Title' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'tags', label: 'Tags' },
  { key: 'createdAt', label: 'Created', sortable: true }
];

// Filtered scopes
const filteredScopes = computed(() => {
  return scopes.value.filter(scope => {
    if (statusFilter.value && scope.status !== statusFilter.value) {
      return false;
    }
    if (clientFilter.value && scope.clientId !== clientFilter.value) {
      return false;
    }
    return true;
  });
});

// Helper functions
function getClientName(clientId) {
  if (!clientId) return '-';
  const client = clients.value.find(c => c.id === clientId);
  return client ? client.name : 'Unknown';
}

function getProjectName(projectId) {
  if (!projectId) return '-';
  const project = projects.value.find(p => p.id === projectId);
  return project ? (project.title || project.name) : 'Unknown';
}

// Delete flow
function confirmDelete(item, type) {
  itemToDelete.value = item;
  deleteType.value = type;
  showDeleteModal.value = true;
}

async function performDelete() {
  if (!itemToDelete.value) return;

  deleting.value = true;
  try {
    if (deleteType.value === 'scope') {
      await scopeStore.deleteScope(itemToDelete.value.id);
      toast.success('Scope deleted successfully');
    } else {
      await scopeStore.deleteTemplate(itemToDelete.value.id);
      toast.success('Template deleted successfully');
    }
    showDeleteModal.value = false;
    itemToDelete.value = null;
  } catch (err) {
    console.error('Error deleting:', err);
    toast.error('Failed to delete. Please try again.');
  } finally {
    deleting.value = false;
  }
}

// Create scope from template
async function createFromTemplate(template) {
  try {
    const newScope = await scopeStore.createScopeFromTemplate(template.id);
    toast.success('Scope created from template');
    if (newScope && newScope.id) {
      router.push(`/scopes/${newScope.id}`);
    }
  } catch (err) {
    console.error('Error creating scope from template:', err);
    toast.error('Failed to create scope from template.');
  }
}

// Load data on mount
onMounted(async () => {
  try {
    const results = await Promise.allSettled([
      scopeStore.fetchScopes(),
      scopeStore.fetchTemplates(),
      clientStore.fetchClients(),
      projectStore.fetchProjects()
    ]);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`Fetch #${i} failed:`, result.reason);
      }
    });
  } catch (err) {
    console.error('Error loading scope data:', err);
    toast.error('Failed to load data. Please try again.');
  }
});
</script>
