<template>
  <PageContainer>
    <header class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="heading-page">{{ formData.id ? `Invoice ${formData.invoiceNumber}` : 'New Invoice' }}</h2>
        <p class="text-caption mt-1" v-if="formData.id">
          <InvoiceStatusBadge :status="formData.status" />
        </p>
      </div>
      <div class="flex gap-3">
        <button @click="showPreview = true" class="btn btn-ghost">Preview</button>
        <button @click="printInvoice" class="btn btn-secondary">Print / PDF</button>
        <button v-if="formData.status === 'draft'" type="button" @click="save" class="btn btn-primary" :disabled="saving || !canSave">
          {{ saving ? 'Saving...' : (formData.id ? 'Save Changes' : 'Create Invoice') }}
        </button>
        <button v-if="formData.id && formData.status === 'draft'" @click="markAsSent" class="btn btn-secondary">
          Mark as Sent
        </button>
        <button v-if="formData.id && (formData.status === 'sent' || formData.status === 'overdue')" @click="markAsPaid" class="btn btn-primary">
          Mark as Paid
        </button>
      </div>
    </header>

    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Main content -->
      <div class="flex-1 lg:w-2/3 space-y-6">
        <!-- Client/Project Section -->
        <div class="card p-5">
          <h3 class="heading-section mb-4">Details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="label">Client *</label>
              <select v-model="formData.clientId" class="input" :class="{ 'border-[var(--danger)]': submitted && !formData.clientId }">
                <option :value="null">— Select client —</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <p v-if="submitted && !formData.clientId" class="text-xs text-[var(--danger)] mt-1">Select a client</p>
            </div>
            <div>
              <label class="label">Project</label>
              <select v-model="formData.projectId" class="input">
                <option :value="null">— None —</option>
                <option v-for="p in filteredProjects" :key="p.id" :value="p.id">{{ p.title }}</option>
              </select>
            </div>
            <div>
              <label class="label">Due Date</label>
              <input v-model="formData.dueDate" type="date" class="input" />
            </div>
            <div>
              <label class="label">Currency</label>
              <select v-model="formData.currency" class="input">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Line Items -->
        <div class="card p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="heading-section">Line Items</h3>
            <button @click="addLineItem" class="btn btn-sm btn-primary">+ Add Item</button>
          </div>

          <div v-if="formData.lineItems.length === 0" class="text-center py-8 text-[var(--text-secondary)]">
            <p>No line items. Add items or import from a scope.</p>
            <p v-if="submitted" class="text-xs text-[var(--danger)] mt-2">Add at least one line item</p>
            <button v-if="availableScopes.length > 0" @click="showScopeImport = true" class="btn btn-sm btn-secondary mt-3">Import from Scope</button>
          </div>

          <div class="space-y-3">
            <InvoiceLineItemRow
              v-for="(item, index) in formData.lineItems"
              :key="item.id"
              :item="item"
              :index="index"
              :show-errors="submitted"
              @update="updateLineItem(index, $event)"
              @remove="removeLineItem(index)"
            />
          </div>
        </div>

        <!-- Notes -->
        <div class="card p-5">
          <h3 class="heading-section mb-4">Notes</h3>
          <textarea v-model="formData.notes" class="input" rows="3" placeholder="Payment terms, additional notes..." />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:w-1/3">
        <InvoiceSummary
          :line-items="formData.lineItems"
          :tax="formData.tax"
          :tax-rate="formData.taxRate"
          :currency="formData.currency"
          @update:tax="formData.tax = $event"
          @update:tax-rate="formData.taxRate = $event"
        />
      </div>
    </div>

    <!-- Preview Modal -->
    <Modal v-model="showPreview" title="Invoice Preview" size="xl">
      <InvoicePreview
        :invoice="previewInvoice"
        :client-name="getClientName(formData.clientId)"
        :project-name="getProjectName(formData.projectId)"
      />
      <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border-light)]">
        <button @click="printInvoice" class="btn btn-secondary">Print / PDF</button>
        <button @click="showPreview = false" class="btn btn-primary">Close</button>
      </div>
    </Modal>

    <!-- Scope Import Modal -->
    <Modal v-model="showScopeImport" title="Import from Scope">
      <div class="space-y-3">
        <div v-for="scope in availableScopes" :key="scope.id"
             class="p-4 border-2 border-[var(--border-light)] cursor-pointer hover:bg-[var(--surface)]"
             @click="importFromScope(scope)">
          <h4 class="font-medium text-[var(--text-primary)]">{{ scope.title }}</h4>
          <p class="text-caption">{{ scope.deliverables?.length || 0 }} deliverables &bull; {{ formatCurrency(scope.totalAmount) }}</p>
        </div>
        <div v-if="availableScopes.length === 0" class="text-center py-6 text-[var(--text-secondary)]">
          <p>No scopes available for the selected project.</p>
        </div>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUnsavedChanges } from '@/composables/useUnsavedChanges';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '@/stores/invoice';
import { useClientStore } from '@/stores/client';
import { useProjectStore } from '@/stores/project';
import { useScopeStore } from '@/stores/scope';
import { getContainer } from '@/core/service-container';
import { INVOICE_REPO } from '@/adapters/repository-keys';
import { formatCurrency } from '@/utils/formatters';
import { useEntityLookup } from '@/composables/useEntityLookup';
import InvoiceStatusBadge from '@/modules/invoices/components/InvoiceStatusBadge.vue';
import InvoiceLineItemRow from '@/modules/invoices/components/InvoiceLineItemRow.vue';
import InvoiceSummary from '@/modules/invoices/components/InvoiceSummary.vue';
import InvoicePreview from '@/modules/invoices/components/InvoicePreview.vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import Modal from '@/components/Modal.vue';

const toast = useToast();
const route = useRoute();
const router = useRouter();
const invoiceStore = useInvoiceStore();
const clientStore = useClientStore();
const projectStore = useProjectStore();
const scopeStore = useScopeStore();
const { getClientName, getProjectName } = useEntityLookup();

// --- State ---

const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const showPreview = ref(false);
const showScopeImport = ref(false);
const submitted = ref(false);
const formData = ref({
  id: null,
  invoiceNumber: '',
  clientId: null,
  projectId: null,
  scopeId: null,
  lineItems: [],
  tax: null,
  taxRate: null,
  currency: 'USD',
  status: 'draft',
  notes: '',
  dueDate: null,
});

const { isDirty, markLoaded, markClean } = useUnsavedChanges(() => formData.value);

// --- Computed ---

const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);

const filteredProjects = computed(() => {
  if (!formData.value.clientId) return [];
  return projects.value.filter(p => p.clientId === formData.value.clientId);
});

const availableScopes = computed(() => {
  if (!formData.value.projectId) return [];
  return scopeStore.scopes.filter(s => s.projectId === formData.value.projectId);
});

const canSave = computed(() => {
  if (!formData.value.clientId) return false;
  if (formData.value.lineItems.length === 0) return false;
  return formData.value.lineItems.every(item =>
    item.description && item.description.trim() !== '' &&
    item.rate > 0 &&
    item.quantity > 0
  );
});

const previewInvoice = computed(() => {
  const items = formData.value.lineItems;
  const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.rate || 0)), 0);
  const effectiveTax = formData.value.taxRate != null
    ? subtotal * (formData.value.taxRate / 100)
    : (formData.value.tax || 0);
  const total = subtotal + effectiveTax;

  return {
    ...formData.value,
    subtotal,
    tax: effectiveTax,
    total,
    lineItems: items.map(item => ({
      ...item,
      amount: (item.quantity || 0) * (item.rate || 0),
    })),
  };
});

// --- Watchers ---

// Reset projectId when client changes
watch(() => formData.value.clientId, (newClientId, oldClientId) => {
  if (oldClientId !== null && newClientId !== oldClientId) {
    formData.value.projectId = null;
  }
});

// Load scopes when projectId changes
watch(() => formData.value.projectId, async (projectId) => {
  if (projectId) {
    try {
      await scopeStore.fetchScopes({ projectId });
    } catch (err) {
      toast.error('Failed to load scopes. Please try again.');
    }
  }
});

// --- Data Loading ---

async function loadClientsAndProjects() {
  try {
    const results = await Promise.allSettled([
      clientStore.fetchClients(),
      projectStore.fetchProjects(),
    ]);
    if (results.some(r => r.status === 'rejected')) {
      toast.error('Failed to load clients or projects. Please try again.');
    }
  } catch (err) {
    toast.error('Failed to load clients or projects. Please try again.');
  }
}

async function loadInvoice(id) {
  if (!id) return;

  loading.value = true;
  error.value = null;

  try {
    const repo = getContainer().resolve(INVOICE_REPO);
    const invoiceData = await repo.findById(id);
    formData.value = {
      id: invoiceData._id?.toString() || invoiceData.id,
      invoiceNumber: invoiceData.invoiceNumber || '',
      clientId: invoiceData.clientId || null,
      projectId: invoiceData.projectId || null,
      scopeId: invoiceData.scopeId || null,
      lineItems: (invoiceData.lineItems || []).map(item => ({
        id: item.id || generateId(),
        description: item.description || '',
        quantity: item.quantity ?? 1,
        unit: item.unit || 'unit',
        rate: item.rate ?? 0,
        amount: item.amount ?? ((item.quantity || 0) * (item.rate || 0)),
      })),
      tax: invoiceData.tax ?? null,
      taxRate: invoiceData.taxRate ?? null,
      currency: invoiceData.currency || 'USD',
      status: invoiceData.status || 'draft',
      notes: invoiceData.notes || '',
      dueDate: invoiceData.dueDate ? invoiceData.dueDate.slice(0, 10) : null,
    };
  } catch (err) {
    error.value = 'Failed to load invoice. Please try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}

// --- Line Item Actions ---

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function addLineItem() {
  formData.value.lineItems.push({
    id: generateId(),
    description: '',
    quantity: 1,
    unit: 'unit',
    rate: 0,
    amount: 0,
  });
}

function updateLineItem(index, updated) {
  formData.value.lineItems[index] = { ...formData.value.lineItems[index], ...updated };
}

function removeLineItem(index) {
  formData.value.lineItems.splice(index, 1);
}

// --- Scope Import ---

function importFromScope(scope) {
  if (!scope.deliverables || scope.deliverables.length === 0) {
    toast.warning('This scope has no deliverables to import.');
    return;
  }

  const newItems = scope.deliverables.map(d => ({
    id: generateId(),
    description: d.title || d.description || '',
    quantity: d.quantity ?? 1,
    unit: d.unit || 'unit',
    rate: d.rate ?? 0,
    amount: (d.quantity ?? 1) * (d.rate ?? 0),
  }));

  formData.value.lineItems.push(...newItems);
  formData.value.scopeId = scope.id;
  showScopeImport.value = false;
  toast.success(`Imported ${newItems.length} items from scope`);
}

// --- Save ---

async function save() {
  submitted.value = true;

  if (!canSave.value) {
    toast.warning('Please fix the validation errors before saving.');
    return;
  }

  saving.value = true;
  error.value = null;

  try {
    const payload = {
      clientId: formData.value.clientId,
      projectId: formData.value.projectId || null,
      scopeId: formData.value.scopeId || null,
      lineItems: formData.value.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
      })),
      tax: formData.value.tax,
      taxRate: formData.value.taxRate,
      currency: formData.value.currency,
      status: formData.value.status,
      notes: formData.value.notes || undefined,
      dueDate: formData.value.dueDate || null,
    };

    if (formData.value.id) {
      const updated = await invoiceStore.updateInvoice(formData.value.id, payload);
      toast.success('Invoice updated successfully!');
      formData.value.invoiceNumber = updated.invoiceNumber || formData.value.invoiceNumber;
    } else {
      const created = await invoiceStore.createInvoice(payload);
      toast.success('Invoice created successfully!');
      formData.value.id = created.id;
      formData.value.invoiceNumber = created.invoiceNumber;
      markClean();
      router.replace(`/invoices/${created.id}`);
    }
    markClean();
  } catch (err) {
    error.value = 'Failed to save invoice. Please try again.';
    toast.error(error.value);
  } finally {
    saving.value = false;
  }
}

// --- Status Actions ---

async function markAsSent() {
  if (!formData.value.id) return;

  saving.value = true;
  try {
    const updated = await invoiceStore.updateInvoice(formData.value.id, { status: 'sent' });
    formData.value.status = updated.status || 'sent';
    toast.success('Invoice marked as sent');
  } catch (err) {
    toast.error('Failed to update invoice status');
  } finally {
    saving.value = false;
  }
}

async function markAsPaid() {
  if (!formData.value.id) return;

  saving.value = true;
  try {
    const updated = await invoiceStore.updateInvoice(formData.value.id, { status: 'paid' });
    formData.value.status = updated.status || 'paid';
    toast.success('Invoice marked as paid');
  } catch (err) {
    toast.error('Failed to update invoice status');
  } finally {
    saving.value = false;
  }
}

// --- Preview ---

function printInvoice() {
  showPreview.value = true;
  // Wait for modal to render before triggering print
  setTimeout(() => window.print(), 300);
}

// --- Initialization ---

onMounted(async () => {
  const id = route.params.id;
  loading.value = true;

  try {
    await loadClientsAndProjects();

    if (id) {
      await loadInvoice(id);
    } else {
      // Reset to blank form
      formData.value = {
        id: null,
        invoiceNumber: '',
        clientId: null,
        projectId: null,
        scopeId: null,
        lineItems: [],
        tax: null,
        taxRate: null,
        currency: 'USD',
        status: 'draft',
        notes: '',
        dueDate: null,
      };
    }
  } catch (err) {
    error.value = 'Failed to initialize page. Please try again.';
  } finally {
    loading.value = false;
    // Use nextTick delay to ensure the watch skips the initial population
    markLoaded();
  }
});
</script>
