<template>
  <section id="audit-log" class="card">
    <h3 class="text-lg font-semibold mb-4">Audit Log</h3>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
    <div v-else-if="logs.length === 0" class="text-center py-6 border dark:border-gray-700 rounded-md">
      <p class="text-gray-500 dark:text-gray-400">No audit log entries found.</p>
    </div>

    <!-- Audit Log Table -->
    <div v-else class="overflow-x-auto border dark:border-gray-700 rounded-md">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Timestamp</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Action</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Resource</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Resource ID</th>
            <th class="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Changes</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-gray-750">
            <td class="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {{ formatTimestamp(log.timestamp) }}
            </td>
            <td class="px-4 py-3">
              <span
                :class="actionBadgeClass(log.action)"
                class="text-xs px-2 py-0.5 rounded-full font-medium"
              >
                {{ log.action }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">
              {{ log.resourceType }}
            </td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
              {{ log.resourceId ? truncateId(log.resourceId) : '-' }}
            </td>
            <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-xs truncate">
              {{ formatChanges(log.changes) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="flex items-center justify-between mt-4">
      <p class="text-xs text-gray-500 dark:text-gray-400">
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
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'update':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'delete':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
