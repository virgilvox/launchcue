<template>
  <PageContainer>
    <PageHeader title="Invoices" :breadcrumbs="breadcrumbs">
      <template #actions>
        <button @click="router.push('/invoices/new')" class="btn btn-primary">New Invoice</button>
      </template>
    </PageHeader>

    <!-- Summary cards row -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p class="text-caption">Outstanding</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(outstandingTotal) }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p class="text-caption">Overdue</p>
        <p class="text-xl font-bold text-red-600">{{ overdueCount }} invoices</p>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <p class="text-caption">Paid This Month</p>
        <p class="text-xl font-bold text-green-600">{{ formatCurrency(paidThisMonth) }}</p>
      </div>
    </div>

    <!-- Filters row: status, client -->
    <div class="flex flex-wrap gap-3 mb-4">
      <select v-model="statusFilter" class="input text-sm w-auto">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="viewed">Viewed</option>
        <option value="paid">Paid</option>
        <option value="overdue">Overdue</option>
      </select>
      <select v-model="clientFilter" class="input text-sm w-auto">
        <option value="">All Clients</option>
        <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- Invoice Table -->
    <DataTable
      :columns="columns"
      :data="filteredInvoices"
      :clickable="true"
      @row-click="row => router.push(`/invoices/${row.id}`)"
    >
      <template #cell-invoiceNumber="{ value }">
        <span class="font-mono font-medium">{{ value }}</span>
      </template>
      <template #cell-status="{ value }">
        <InvoiceStatusBadge :status="value" />
      </template>
      <template #cell-clientId="{ row }">
        {{ getClientName(row.clientId) }}
      </template>
      <template #cell-total="{ value }">
        {{ formatCurrency(value) }}
      </template>
      <template #cell-dueDate="{ value }">
        {{ value ? formatDate(value) : '—' }}
      </template>
      <template #actions="{ row }">
        <button @click.stop="confirmDelete(row)" class="text-red-500 hover:text-red-700 text-sm">Delete</button>
      </template>
    </DataTable>

    <!-- Delete modal -->
    <Modal v-model="showDeleteModal" title="Delete Invoice">
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        Are you sure you want to delete invoice {{ deleteTarget?.invoiceNumber }}?
      </p>
      <div class="flex justify-end gap-3">
        <button @click="showDeleteModal = false" class="btn btn-secondary">Cancel</button>
        <button @click="performDelete" class="btn btn-danger" :disabled="deleting">
          {{ deleting ? 'Deleting...' : 'Delete' }}
        </button>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '@/stores/invoice';
import { useClientStore } from '@/stores/client';
import { formatCurrency } from '@/utils/formatters';
import { formatDate } from '@/utils/dateFormatter';
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge.vue';
import DataTable from '@/components/ui/DataTable.vue';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import Modal from '@/components/Modal.vue';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const clientStore = useClientStore();

// --- State ---

const statusFilter = ref('');
const clientFilter = ref('');
const showDeleteModal = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);

// --- Breadcrumbs ---

const breadcrumbs = [
  { label: 'Dashboard', to: '/' },
  { label: 'Invoices' },
];

// --- Table Columns ---

const columns = [
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'clientId', label: 'Client' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Amount', sortable: true },
  { key: 'dueDate', label: 'Due Date', sortable: true },
];

// --- Computed ---

const clients = computed(() => clientStore.clients);

const outstandingTotal = computed(() => invoiceStore.outstandingTotal);

const overdueCount = computed(() => invoiceStore.overdueCount);

const paidThisMonth = computed(() => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return invoiceStore.invoices
    .filter(inv => {
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      const paidDate = new Date(inv.paidAt);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + (inv.paidAmount ?? inv.total), 0);
});

const filteredInvoices = computed(() => {
  let result = invoiceStore.invoices;

  if (statusFilter.value) {
    result = result.filter(inv => inv.status === statusFilter.value);
  }

  if (clientFilter.value) {
    result = result.filter(inv => inv.clientId === clientFilter.value);
  }

  return result;
});

// --- Helpers ---

function getClientName(clientId) {
  if (!clientId) return '—';
  const client = clients.value.find(c => c.id === clientId);
  return client ? client.name : '—';
}

// --- Delete Flow ---

function confirmDelete(invoice) {
  deleteTarget.value = invoice;
  showDeleteModal.value = true;
}

async function performDelete() {
  if (!deleteTarget.value) return;

  deleting.value = true;
  try {
    await invoiceStore.deleteInvoice(deleteTarget.value.id);
    toast.success('Invoice deleted successfully');
    showDeleteModal.value = false;
    deleteTarget.value = null;
  } catch (err) {
    console.error('Error deleting invoice:', err);
    toast.error('Failed to delete invoice');
  } finally {
    deleting.value = false;
  }
}

// --- Data Loading ---

onMounted(async () => {
  try {
    await Promise.all([
      invoiceStore.fetchInvoices(),
      clientStore.fetchClients(),
    ]);
  } catch (err) {
    console.error('Error loading invoice data:', err);
    toast.error('Failed to load invoices');
  }
});
</script>
