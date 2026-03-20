<template>
  <PageContainer>
    <div v-if="loading" class="p-8 text-center">
      <LoadingSpinner text="Loading task details..." />
    </div>
    <div v-else-if="error" class="p-8 text-center text-[var(--danger)]">Error loading task: {{ error }}</div>
    <div v-else-if="!task" class="p-8 text-center">
      <p class="text-[var(--text-secondary)] mb-4">Task not found.</p>
      <router-link to="/tasks" class="btn btn-primary">Back to Tasks</router-link>
    </div>

    <template v-else>
      <PageHeader
        :title="task.title"
        backTo="/tasks"
        :breadcrumbs="breadcrumbItems"
      >
        <template #actions>
          <button type="button" class="btn btn-secondary" @click="openEditModal">
            Edit Task
          </button>
          <button @click="confirmDelete" class="btn btn-danger">Delete</button>
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Description Card -->
          <div v-if="task.description" class="card p-5">
            <h3 class="heading-card mb-3">Description</h3>
            <p class="text-[var(--text-secondary)] whitespace-pre-wrap">{{ task.description }}</p>
          </div>

          <!-- Checklist Card -->
          <div v-if="task.checklist && task.checklist.length > 0" class="card p-5">
            <h3 class="heading-card mb-3">
              Checklist
              <span class="text-sm font-normal text-[var(--text-secondary)] ml-2">
                {{ completedChecklistCount }}/{{ task.checklist.length }}
              </span>
            </h3>
            <div class="w-full bg-[var(--surface)] h-1.5 mb-4">
              <div
                class="h-1.5 bg-[var(--accent-primary)] transition-all duration-300"
                :style="{ width: checklistProgress + '%' }"
              ></div>
            </div>
            <ul class="space-y-2">
              <li
                v-for="(item, index) in task.checklist"
                :key="item.id || index"
                class="flex items-center gap-3 py-1.5 px-2 hover:bg-[var(--surface)] transition-colors cursor-pointer"
                @click="toggleChecklistItem(index)"
              >
                <input
                  type="checkbox"
                  :checked="item.completed"
                  class="h-4 w-4 accent-[var(--accent-primary)]"
                  @click.stop="toggleChecklistItem(index)"
                />
                <span :class="{ 'line-through text-[var(--text-secondary)]': item.completed }">
                  {{ item.title }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Comments -->
          <CommentThread resourceType="task" :resourceId="id" />
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Metadata Card -->
          <div class="card p-5 space-y-4">
            <div>
              <span class="label text-xs">Status</span>
              <div class="mt-1">
                <span class="badge px-2.5 py-1 text-sm font-medium" :class="statusColor">
                  {{ task.status }}
                </span>
              </div>
            </div>

            <div v-if="task.priority">
              <span class="label text-xs">Priority</span>
              <div class="mt-1">
                <span class="badge px-2.5 py-1 text-sm font-medium" :class="priorityColor">
                  {{ task.priority }}
                </span>
              </div>
            </div>

            <div>
              <span class="label text-xs">Due Date</span>
              <p class="text-sm text-[var(--text-primary)] mt-1">{{ formattedDueDate }}</p>
            </div>

            <div v-if="projectName !== 'N/A'">
              <span class="label text-xs">Project</span>
              <p class="mt-1">
                <router-link
                  :to="`/projects/${task.projectId}`"
                  class="text-sm text-[var(--accent-primary)] hover:underline"
                >
                  {{ projectName }}
                </router-link>
              </p>
            </div>

            <div v-if="clientName !== 'N/A'">
              <span class="label text-xs">Client</span>
              <p class="text-sm text-[var(--text-primary)] mt-1">{{ clientName }}</p>
            </div>

            <div v-if="task.tags && task.tags.length">
              <span class="label text-xs">Tags</span>
              <div class="flex flex-wrap gap-1.5 mt-1">
                <span
                  v-for="tag in task.tags"
                  :key="tag"
                  class="text-xs px-2 py-0.5 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <div>
              <span class="label text-xs">Created</span>
              <p class="text-sm text-[var(--text-secondary)] mt-1">{{ formattedCreatedAt }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Edit Modal -->
      <div v-if="editModal.isOpen.value" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <h3 class="heading-section mb-4">Edit Task</h3>
          <form @submit.prevent="saveEdit">
            <div class="space-y-4">
              <div>
                <label for="editTitle" class="label">Title <span class="text-[var(--danger)]">*</span></label>
                <input id="editTitle" v-model="editModal.formData.value.title" type="text" class="input" required />
              </div>
              <div>
                <label for="editDescription" class="label">Description</label>
                <textarea id="editDescription" v-model="editModal.formData.value.description" class="input" rows="4"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="editDueDate" class="label">Due Date</label>
                  <input id="editDueDate" v-model="editModal.formData.value.dueDate" type="date" class="input" />
                </div>
                <div>
                  <label for="editPriority" class="label">Priority</label>
                  <select id="editPriority" v-model="editModal.formData.value.priority" class="input">
                    <option value="">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="editStatus" class="label">Status</label>
                <select id="editStatus" v-model="editModal.formData.value.status" class="input">
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" @click="editModal.close()" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-primary" :disabled="editModal.isLoading.value">
                {{ editModal.isLoading.value ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete Confirmation -->
      <div v-if="deleteDialog.isOpen.value" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6 w-full max-w-md">
          <h3 class="heading-section mb-4">Confirm Delete</h3>
          <p class="text-[var(--text-secondary)] mb-6">
            Are you sure you want to delete "<strong>{{ task.title }}</strong>"? This action cannot be undone.
          </p>
          <div class="flex justify-end space-x-3">
            <button @click="deleteDialog.cancel()" class="btn btn-secondary">Cancel</button>
            <button @click="deleteDialog.confirm()" class="btn btn-danger" :disabled="deleteDialog.isProcessing.value">
              {{ deleteDialog.isProcessing.value ? 'Deleting...' : 'Delete Task' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useTaskStore } from '@/stores/task';
import { useProjectStore } from '@/stores/project';
import { useClientStore } from '@/stores/client';
import { useModalState } from '@/composables/useModalState';
import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { format } from 'date-fns';
import PageContainer from '@/components/ui/PageContainer.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import CommentThread from '@/components/ui/CommentThread.vue';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const taskStore = useTaskStore();
const projectStore = useProjectStore();
const clientStore = useClientStore();

const task = ref(null);
const loading = ref(true);
const error = ref(null);

const editModal = useModalState(() => ({
  title: '',
  description: '',
  dueDate: '',
  priority: '',
  status: 'To Do',
}));

const deleteDialog = useConfirmDialog();

// ─── Status / Priority color maps ───

const statusColorMap = {
  'To Do': 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'In Review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const priorityColorMap = {
  'Low': 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]',
  'Medium': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'High': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const statusColor = computed(() => statusColorMap[task.value?.status] || statusColorMap['To Do']);
const priorityColor = computed(() => priorityColorMap[task.value?.priority] || '');

// ─── Computed ───

const formattedDueDate = computed(() => {
  return task.value?.dueDate ? format(new Date(task.value.dueDate), 'PPP') : 'Not set';
});

const formattedCreatedAt = computed(() => {
  return task.value?.createdAt ? format(new Date(task.value.createdAt), 'PPP') : '';
});

const projectName = computed(() => {
  if (!task.value?.projectId) return 'N/A';
  const project = projectStore.projects.find(p => p.id === task.value.projectId);
  return project ? project.title : 'Unknown Project';
});

const clientName = computed(() => {
  if (!task.value?.clientId) return 'N/A';
  if (task.value.projectId) {
    const project = projectStore.projects.find(p => p.id === task.value.projectId);
    if (project?.clientId) {
      const client = clientStore.clients.find(c => c.id === project.clientId);
      return client ? client.name : 'Unknown Client';
    }
  }
  return 'N/A';
});

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tasks', to: '/tasks' },
  { label: task.value?.title || 'Task' }
]);

const completedChecklistCount = computed(() => {
  return task.value?.checklist?.filter(i => i.completed).length || 0;
});

const checklistProgress = computed(() => {
  if (!task.value?.checklist?.length) return 0;
  return Math.round((completedChecklistCount.value / task.value.checklist.length) * 100);
});

// ─── Data loading ───

const fetchTaskDetails = async (taskId) => {
  loading.value = true;
  error.value = null;
  try {
    if (!projectStore.projects.length) await projectStore.fetchProjects();
    if (!clientStore.clients.length) await clientStore.fetchClients();

    const fetchedTask = await taskStore.getTaskById(taskId);
    if (fetchedTask) {
      task.value = fetchedTask;
    } else {
      error.value = 'Task could not be found.';
      task.value = null;
    }
  } catch (err) {
    error.value = err.message || 'Failed to load task details.';
  } finally {
    loading.value = false;
  }
};

// ─── Checklist toggle ───

async function toggleChecklistItem(index) {
  const checklist = [...task.value.checklist];
  checklist[index] = { ...checklist[index], completed: !checklist[index].completed };

  try {
    const result = await taskStore.updateTask({ id: task.value.id, checklist });
    task.value = { ...task.value, checklist: result.checklist || checklist };
  } catch (err) {
    toast.error('Failed to update checklist');
  }
}

// ─── Edit ───

function openEditModal() {
  editModal.open(task.value);
  editModal.formData.value = {
    title: task.value.title,
    description: task.value.description || '',
    dueDate: task.value.dueDate ? new Date(task.value.dueDate).toISOString().split('T')[0] : '',
    priority: task.value.priority || '',
    status: task.value.status || 'To Do',
  };
}

async function saveEdit() {
  editModal.setLoading(true);
  try {
    const updates = {
      id: task.value.id,
      title: editModal.formData.value.title,
      description: editModal.formData.value.description || '',
      dueDate: editModal.formData.value.dueDate || null,
      priority: editModal.formData.value.priority || 'Medium',
      status: editModal.formData.value.status,
      completed: editModal.formData.value.status === 'Done',
    };
    const result = await taskStore.updateTask(updates);
    task.value = { ...task.value, ...result };
    editModal.close();
    toast.success('Task updated');
  } catch (err) {
    toast.error('Failed to save task');
  } finally {
    editModal.setLoading(false);
  }
}

// ─── Delete ───

async function confirmDelete() {
  const confirmed = await deleteDialog.requestConfirm(task.value);
  if (confirmed) {
    try {
      await taskStore.deleteTask(task.value.id);
      toast.success('Task deleted');
      router.push('/tasks');
    } catch (err) {
      toast.error('Failed to delete task');
    } finally {
      deleteDialog.done();
    }
  }
}

// ─── Lifecycle ───

onMounted(() => {
  fetchTaskDetails(props.id);
});

watch(() => props.id, (newId) => {
  if (newId) fetchTaskDetails(newId);
});
</script>
