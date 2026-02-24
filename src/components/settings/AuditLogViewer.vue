<template>
  <section id="audit-log" class="card">
    <h3 class="text-lg font-semibold mb-4">Audit Log</h3>
    <p class="text-sm text-[var(--text-secondary)] mb-4">
      View recent activity and changes made across your team workspace.
    </p>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <select v-model="filters.resourceType" @change="loadLogs(1)" class="input text-sm w-auto">
        <option value="">All Resources</option>
        <option value="task">Tasks</option>
        <option value="project">Projects</option>
        <option value="client">Clients</option>
        <option value="campaign">Campaigns</option>
        <option value="note">Notes</option>
      </select>
      <select v-model="filters.action" @change="loadLogs(1)" class="input text-sm w-auto">
        <option value="">All Actions</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <LoadingSpinner size="small" text="Loading audit logs..." />
    </div>

    <!-- Empty State -->
    <div v-else-if="logs.length === 0" class="text-center py-6 border border-[var(--border-light)]">
      <p class="text-[var(--text-secondary)]">No audit log entries found.</p>
    </div>

    <!-- Audit Log Table -->
    <div v-else class="overflow-x-auto border border-[var(--border-light)]">
      <table class="w-full text-sm">
        <thead class="bg-[var(--surface)]">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Timestamp</th>
            <th class="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Action</th>
            <th class="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Resource</th>
            <th class="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Resource ID</th>
            <th class="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Changes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--border-light)]">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-[var(--surface)]">
            <td class="px-4 py-3 text-[var(--text-primary)] whitespace-nowrap">
              {{ formatTimestamp(log.timestamp) }}
            </td>
            <td class="px-4 py-3">
              <span
                :class="actionBadgeClass(log.action)"
                class="text-xs px-2 py-0.5 font-medium"
              >
                {{ log.action }}
              </span>
            </td>
            <td class="px-4 py-3 text-[var(--text-primary)] capitalize">
              {{ log.resourceType }}
            </td>
            <td class="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
              {{ log.resourceId ? truncateId(log.resourceId) : '-' }}
            </td>
            <td class="px-4 py-3 text-[var(--text-secondary)] text-xs max-w-xs truncate">
              {{ formatChanges(log.changes) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="flex items-center justify-between mt-4">
      <p class="text-xs text-[var(--text-secondary)]">
        Page {{ pagination.page }} of {{ pagination.totalPages }} ({{ pagination.total }} entries)
      </p>
      <div class="flex gap-2">
        <button
          @click="loadLogs(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="btn-outline text-xs px-3 py-1"
        >
          Previous
        </button>
        <button
          @click="loadLogs(pagination.page + 1)"
          :disabled="!pagination.hasMore"
          class="btn-outline text-xs px-3 py-1"
        >
          Next
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import auditLogService from '../../services/auditLog.service';
import { useToast } from 'vue-toastification';
import LoadingSpinner from '../LoadingSpinner.vue';

const toast = useToast();

const logs = ref([]);
const loading = ref(false);
const pagination = ref(null);

const filters = ref({
  resourceType: '',
  action: '',
});

async function loadLogs(page = 1) {
  loading.value = true;
  try {
    const params = { page, limit: 25 };
    if (filters.value.resourceType) params.resourceType = filters.value.resourceType;
    if (filters.value.action) params.action = filters.value.action;

    const result = await auditLogService.getAuditLogs(params);

    if (result && result.data) {
      logs.value = result.data;
      pagination.value = result.pagination;
    } else if (Array.isArray(result)) {
      logs.value = result;
      pagination.value = null;
    }
  } catch (error) {
    console.error('Error loading audit logs:', error);
    toast.error('Failed to load audit logs.');
  } finally {
    loading.value = false;
  }
}

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  const date = new Date(ts);
  return date.toLocaleString();
}

function actionBadgeClass(action) {
  switch (action) {
    case 'create':
      return 'bg-[var(--surface)] text-[var(--success)] border border-[var(--success)]';
    case 'update':
      return 'bg-[var(--accent-primary-wash)] text-[var(--accent-primary)] border border-[var(--accent-primary)]';
    case 'delete':
      return 'bg-[var(--surface)] text-[var(--danger)] border border-[var(--danger)]';
    default:
      return 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-light)]';
  }
}

function truncateId(id) {
  if (!id || id.length <= 12) return id || '-';
  return id.substring(0, 8) + '...';
}

function formatChanges(changes) {
  if (!changes || typeof changes !== 'object') return '-';
  const keys = Object.keys(changes);
  if (keys.length === 0) return '-';
  return keys.map(key => `${key}: ${changes[key]?.from || '(empty)'} -> ${changes[key]?.to || '(empty)'}`).join(', ');
}

onMounted(() => {
  loadLogs();
});
</script>
