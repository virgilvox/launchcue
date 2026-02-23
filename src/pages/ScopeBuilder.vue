<template>
  <PageContainer>
    <div class="flex flex-col h-full">
      <header class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="heading-page">{{ isTemplate ? 'Template Builder' : 'Scope Builder' }}</h2>
          <p class="text-caption mt-1" v-if="formData.id">Editing: {{ formData.title }}</p>
        </div>
        <div class="flex gap-3">
          <button @click="showPreview = true" class="btn btn-ghost">Preview</button>
          <button @click="save" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : (formData.id ? 'Save Changes' : (isTemplate ? 'Save Template' : 'Save Scope')) }}
          </button>
        </div>
      </header>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Main content (2/3 width on lg) -->
        <div class="flex-1 lg:w-2/3 space-y-6">
          <!-- Basic Info Card -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <h3 class="heading-section mb-4">Details</h3>
            <div class="space-y-4">
              <div>
                <label class="label">Title *</label>
                <input v-model="formData.title" type="text" class="input" placeholder="Scope title" />
              </div>
              <div>
                <label class="label">Description</label>
                <textarea v-model="formData.description" class="input" rows="3" placeholder="Brief description" />
              </div>

              <!-- Only for project scopes, not templates -->
              <template v-if="!isTemplate">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="label">Client</label>
                    <select v-model="formData.clientId" class="input">
                      <option :value="null">— Select client —</option>
                      <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="label">Project</label>
                    <select v-model="formData.projectId" class="input">
                      <option :value="null">— Select project —</option>
                      <option v-for="p in filteredProjects" :key="p.id" :value="p.id">{{ p.title }}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="label">Status</label>
                  <select v-model="formData.status" class="input">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="approved">Approved</option>
                    <option value="revised">Revised</option>
                  </select>
                </div>
              </template>

              <!-- Only for templates -->
              <template v-if="isTemplate">
                <div>
                  <label class="label">Tags</label>
                  <input v-model="tagsInput" type="text" class="input" placeholder="Comma-separated tags" @blur="parseTags" />
                  <div class="flex flex-wrap gap-1 mt-2">
                    <span v-for="(tag, i) in formData.tags" :key="i" class="inline-flex items-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2 py-0.5 rounded">
                      {{ tag }}
                      <button @click="removeTag(i)" class="ml-1 text-indigo-500 hover:text-indigo-700">&times;</button>
                    </span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Deliverables Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <div class="flex justify-between items-center mb-4">
              <h3 class="heading-section">Deliverables</h3>
              <button @click="addDeliverable" class="btn btn-sm btn-primary">+ Add Deliverable</button>
            </div>

            <div v-if="formData.deliverables.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No deliverables yet. Click "Add Deliverable" to get started.</p>
            </div>

            <div class="space-y-3">
              <ScopeDeliverableRow
                v-for="(deliverable, index) in formData.deliverables"
                :key="deliverable.id"
                :deliverable="deliverable"
                :index="index"
                :show-status="!isTemplate"
                @update="updateDeliverable(index, $event)"
                @remove="removeDeliverable(index)"
                @move-up="moveDeliverable(index, -1)"
                @move-down="moveDeliverable(index, 1)"
              />
            </div>
          </div>

          <!-- Terms Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
            <h3 class="heading-section mb-4">Terms & Conditions</h3>
            <ScopeTermsEditor v-model="formData.terms" />
          </div>
        </div>

        <!-- Sidebar (1/3 width on lg) -->
        <div class="lg:w-1/3">
          <ScopeSummaryCard
            :deliverables="formData.deliverables"
            :status="formData.status"
            :is-template="isTemplate"
          />
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <Modal v-model="showPreview" title="Scope Preview" size="xl">
      <ScopePreview
        :scope="formData"
        :client-name="getClientName(formData.clientId)"
        :project-name="getProjectName(formData.projectId)"
        :is-template="isTemplate"
      />
      <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button @click="printScope" class="btn btn-secondary">Print / PDF</button>
        <button @click="showPreview = false" class="btn btn-primary">Close</button>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useScopeStore } from '@/stores/scope';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import scopeService from '@/services/scope.service';
import ScopeDeliverableRow from '@/components/scope/ScopeDeliverableRow.vue';
import ScopeTermsEditor from '@/components/scope/ScopeTermsEditor.vue';
import ScopeSummaryCard from '@/components/scope/ScopeSummaryCard.vue';
import ScopePreview from '@/components/scope/ScopePreview.vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import Modal from '@/components/Modal.vue';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const scopeStore = useScopeStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();

// --- State ---

const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const showPreview = ref(false);
const tagsInput = ref('');

const formData = ref({
  id: null,
  title: '',
  description: '',
  clientId: null,
  projectId: null,
  templateId: null,
  deliverables: [],
  terms: '',
  tags: [],
  status: 'draft',
});

// --- Computed ---

const isTemplate = computed(() => route.path.includes('scope-template'));

const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);

const filteredProjects = computed(() => {
  if (!formData.value.clientId) return [];
  return projects.value.filter(p => p.clientId === formData.value.clientId);
});

// --- Watchers ---

// Reset projectId when client changes
watch(() => formData.value.clientId, () => {
  formData.value.projectId = null;
});

// --- Data Loading ---

async function loadClientsAndProjects() {
  try {
    await Promise.all([
      clientStore.fetchClients(),
      projectStore.fetchProjects(),
    ]);
  } catch (err) {
    console.error('Error loading clients/projects:', err);
  }
}

async function loadScope(id) {
  if (!id) return;

  loading.value = true;
  error.value = null;

  try {
    const scopeData = await scopeService.getScope(id);
    formData.value = {
      id: scopeData._id?.toString() || scopeData.id,
      title: scopeData.title || '',
      description: scopeData.description || '',
      clientId: scopeData.clientId || null,
      projectId: scopeData.projectId || null,
      templateId: scopeData.templateId || null,
      deliverables: (scopeData.deliverables || []).map(d => ({
        id: d.id || Date.now().toString() + Math.random().toString(36).slice(2),
        title: d.title || '',
        description: d.description || '',
        quantity: d.quantity ?? 1,
        unit: d.unit || 'unit',
        rate: d.rate ?? 0,
        estimatedHours: d.estimatedHours ?? 0,
        status: d.status || 'pending',
        completedAt: d.completedAt || null,
        approvedBy: d.approvedBy || null,
      })),
      terms: scopeData.terms || '',
      tags: [],
      status: scopeData.status || 'draft',
    };
  } catch (err) {
    console.error('Error loading scope:', err);
    error.value = 'Failed to load scope. Please try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

async function loadTemplate(id) {
  if (!id) return;

  loading.value = true;
  error.value = null;

  try {
    const templateData = await scopeService.getScopeTemplate(id);
    formData.value = {
      id: templateData._id?.toString() || templateData.id,
      title: templateData.title || '',
      description: templateData.description || '',
      clientId: null,
      projectId: null,
      templateId: null,
      deliverables: (templateData.deliverables || []).map(d => ({
        id: d.id || Date.now().toString() + Math.random().toString(36).slice(2),
        title: d.title || '',
        description: d.description || '',
        quantity: d.quantity ?? 1,
        unit: d.unit || 'unit',
        rate: d.rate ?? 0,
        estimatedHours: d.estimatedHours ?? 0,
      })),
      terms: templateData.terms || '',
      tags: templateData.tags || [],
      status: 'draft',
    };
    tagsInput.value = (templateData.tags || []).join(', ');
  } catch (err) {
    console.error('Error loading template:', err);
    error.value = 'Failed to load template. Please try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

// --- Deliverable Actions ---

function addDeliverable() {
  formData.value.deliverables.push({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    title: '',
    description: '',
    quantity: 1,
    unit: 'unit',
    rate: 0,
    estimatedHours: 0,
    ...(isTemplate.value ? {} : { status: 'pending' }),
  });
}

function updateDeliverable(index, updated) {
  formData.value.deliverables[index] = { ...formData.value.deliverables[index], ...updated };
}

function removeDeliverable(index) {
  formData.value.deliverables.splice(index, 1);
}

function moveDeliverable(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= formData.value.deliverables.length) return;

  const items = formData.value.deliverables;
  const temp = items[index];
  items[index] = items[newIndex];
  items[newIndex] = temp;
}

// --- Tag Actions ---

function parseTags() {
  formData.value.tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

function removeTag(index) {
  formData.value.tags.splice(index, 1);
  tagsInput.value = formData.value.tags.join(', ');
}

// --- Save ---

async function save() {
  if (!formData.value.title) {
    toast.warning('Title is required.');
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    if (isTemplate.value) {
      const templatePayload = {
        title: formData.value.title,
        description: formData.value.description || undefined,
        deliverables: formData.value.deliverables.map(d => ({
          title: d.title,
          description: d.description || undefined,
          quantity: d.quantity,
          unit: d.unit,
          rate: d.rate,
          estimatedHours: d.estimatedHours,
        })),
        terms: formData.value.terms || undefined,
        tags: formData.value.tags,
      };

      if (formData.value.id) {
        await scopeStore.updateTemplate(formData.value.id, templatePayload);
        toast.success('Template updated successfully!');
      } else {
        const created = await scopeStore.createTemplate(templatePayload);
        toast.success('Template created successfully!');
        formData.value.id = created.id;
        router.replace(`/scope-templates/${created.id}`);
      }
    } else {
      const scopePayload = {
        title: formData.value.title,
        description: formData.value.description || undefined,
        clientId: formData.value.clientId || null,
        projectId: formData.value.projectId || null,
        templateId: formData.value.templateId || null,
        deliverables: formData.value.deliverables.map(d => ({
          title: d.title,
          description: d.description || undefined,
          quantity: d.quantity,
          unit: d.unit,
          rate: d.rate,
          estimatedHours: d.estimatedHours,
          status: d.status || 'pending',
        })),
        terms: formData.value.terms || undefined,
        status: formData.value.status || 'draft',
      };

      if (formData.value.id) {
        await scopeStore.updateScope(formData.value.id, scopePayload);
        toast.success('Scope updated successfully!');
      } else {
        const created = await scopeStore.createScope(scopePayload);
        toast.success('Scope created successfully!');
        formData.value.id = created.id;
        router.replace(`/scopes/${created.id}`);
      }
    }
  } catch (err) {
    console.error('Error saving:', err);
    error.value = isTemplate.value
      ? 'Failed to save template. Please try again.'
      : 'Failed to save scope. Please try again.';
    toast.error(error.value);
  } finally {
    saving.value = false;
  }
}

// --- Preview ---

function printScope() {
  window.print();
}

// --- Helpers ---

const getClientName = (clientId) => {
  if (!clientId) return null;
  const client = clients.value.find(c => c.id === clientId);
  return client ? client.name : null;
};

const getProjectName = (projectId) => {
  if (!projectId) return null;
  const project = projects.value.find(p => p.id === projectId);
  return project ? project.title : null;
};

// --- Initialization ---

onMounted(async () => {
  const id = route.params.id;
  loading.value = true;

  try {
    await loadClientsAndProjects();

    if (id) {
      if (isTemplate.value) {
        await loadTemplate(id);
      } else {
        await loadScope(id);
      }
    } else {
      // Reset to blank form
      formData.value = {
        id: null,
        title: '',
        description: '',
        clientId: null,
        projectId: null,
        templateId: null,
        deliverables: [],
        terms: '',
        tags: [],
        status: 'draft',
      };
      tagsInput.value = '';
    }
  } catch (err) {
    console.error('Error initializing scope builder:', err);
    error.value = 'Failed to initialize page. Please try again.';
  } finally {
    loading.value = false;
  }
});
</script>
