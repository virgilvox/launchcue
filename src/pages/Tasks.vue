<template>
  <PageContainer>
    <PageHeader title="Tasks" subtitle="Manage your tasks and track their progress">
      <template #actions>
        <!-- View Toggle -->
        <div class="inline-flex border-2 border-[var(--border)]">
          <button
            @click="viewMode = 'list'"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 text-body-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            ]"
            title="List view"
          >
            <TableCellsIcon class="h-4 w-4" />
            <span class="hidden sm:inline">LIST</span>
          </button>
          <button
            @click="viewMode = 'kanban'"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 text-body-sm font-medium transition-colors border-l-2 border-[var(--border)]',
              viewMode === 'kanban'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            ]"
            title="Kanban view"
          >
            <ViewColumnsIcon class="h-4 w-4" />
            <span class="hidden sm:inline">KANBAN</span>
          </button>
        </div>

        <button v-if="authStore.canEdit" @click="openNewTaskModal" class="btn btn-primary">
          <PlusIcon class="h-5 w-5 mr-1" />
          Add Task
        </button>
        <button @click="fetchTasks" class="btn btn-outline" title="Refresh Tasks">
          <ArrowPathIcon class="h-5 w-5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </template>
    </PageHeader>

    <!-- Filter and Sort Controls -->
    <TaskFilters v-model="filters" />

    <!-- Loading State -->
    <div v-if="isLoading && tasks.length === 0" class="flex justify-center my-12">
      <LoadingSpinner text="Loading tasks..." />
    </div>

    <!-- Task List View -->
    <TaskList
      v-else-if="viewMode === 'list' && filteredAndSortedTasks.length > 0"
      :tasks="filteredAndSortedTasks"
      @edit="handleEditTask"
      @delete="handleConfirmDeleteTask"
      @updateStatus="handleUpdateTaskStatus"
      @openChecklist="handleOpenChecklist"
    />

    <!-- Kanban View -->
    <TaskKanban
      v-else-if="viewMode === 'kanban' && filteredAndSortedTasks.length > 0"
      :tasks="filteredAndSortedTasks"
      :projects="projects"
      @edit="handleEditTask"
      @delete="handleConfirmDeleteTask"
      @updateStatus="handleUpdateTaskStatus"
    />

    <!-- Empty State -->
    <EmptyState
      v-else
      :icon="ClipboardDocumentIcon"
      :title="tasks.length > 0 ? 'No tasks match filters' : 'No tasks yet'"
      :description="tasks.length > 0 ? 'Try adjusting your filters.' : 'Break work into trackable tasks with status, priority, and deadlines.'"
      :actionLabel="tasks.length === 0 ? 'ADD TASK' : ''"
      @action="openNewTaskModal"
    />

    <!-- New/Edit Task Modal -->
    <Modal v-model="showTaskFormModal" :title="isEditing ? 'Edit Task' : 'New Task'">
      <TaskForm 
        :task="currentTaskForEdit" 
        :isSaving="isSavingTask"
        @save="handleSaveTask"
        @cancel="showTaskFormModal = false"
      />
    </Modal>

    <!-- Checklist Modal -->
    <TaskChecklistModal 
       v-if="currentTaskForChecklist" 
       v-model="showChecklistModal" 
       :task="currentTaskForChecklist"
       @updateChecklist="handleUpdateChecklist"
     />

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Confirm Delete" size="sm">
      <div v-if="taskToDelete" class="space-y-4">
        <p class="text-body">Are you sure you want to delete this task?</p>
        <p class="font-medium text-[var(--text-primary)]">{{ taskToDelete.title }}</p>
        <p class="text-body-sm text-[var(--danger)]">This action cannot be undone.</p>

        <div class="flex justify-end gap-3 pt-4 border-t-2 border-[var(--border-light)]">
          <button type="button" @click="showDeleteModal = false" class="btn btn-secondary">
            CANCEL
          </button>
          <button
            type="button"
            @click="handleDeleteTask"
            class="btn btn-danger"
            :disabled="isDeletingTask"
           >
            {{ isDeletingTask ? 'DELETING...' : 'DELETE TASK' }}
          </button>
        </div>
      </div>
    </Modal>
  </PageContainer>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTaskStore } from '../stores/task'
import { useProjectStore } from '../stores/project'
import { useClientStore } from '../stores/client'
import { useTeamStore } from '../stores/team'
import { useToast } from 'vue-toastification' // Assuming vue-toastification is installed and configured
import {
  PlusIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  TableCellsIcon,
  ViewColumnsIcon
} from '@heroicons/vue/24/outline'

// Import Components
import PageContainer from '@/components/ui/PageContainer.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Modal from '../components/Modal.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import TaskFilters from '../components/tasks/TaskFilters.vue'
import TaskList from '../components/tasks/TaskList.vue'
import TaskForm from '../components/tasks/TaskForm.vue'
import TaskKanban from '../components/tasks/TaskKanban.vue'
import TaskChecklistModal from '../components/tasks/TaskChecklistModal.vue'
import EmptyState from '../components/ui/EmptyState.vue'

// Stores & Toast
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const clientStore = useClientStore()
const teamStore = useTeamStore()
const toast = useToast()

// Auth
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()

// State
const viewMode = ref('list')
const isLoading = ref(false) // Combined loading state
const isSavingTask = ref(false)
const isDeletingTask = ref(false)

const tasks = computed(() => taskStore.tasks)
const projects = computed(() => projectStore.projects)
const clients = computed(() => clientStore.clients)

const filters = ref({
  status: '',
  type: '',
  priority: '',
  assigneeId: null,
  clientId: null,
  projectId: null,
  sortBy: 'dueDate' // Default sort
})

// Modal visibility states
const showTaskFormModal = ref(false)
const showChecklistModal = ref(false)
const showDeleteModal = ref(false)

// State for modals
const currentTaskForEdit = ref(null) // Task being edited or template for new
const currentTaskForChecklist = ref(null)
const taskToDelete = ref(null)

const isEditing = computed(() => !!currentTaskForEdit.value?.id)

// Computed: Filtered and Sorted Tasks
const filteredAndSortedTasks = computed(() => {
  // Guard against non-array state or empty array
  if (!Array.isArray(tasks.value) || tasks.value.length === 0) return []; 

  // Create a map for quick project-to-client lookup
  // Guard against non-array state
  const projectClientMap = Array.isArray(projects.value) 
    ? projects.value.reduce((map, project) => {
        map[project.id] = project.clientId;
        return map;
      }, {}) 
    : {};

  // Filter out any dummy or invalid tasks
  let result = tasks.value.filter(task => task && task.id && task.title);
  
  // If we have no valid tasks, return empty array
  if (result.length === 0) return [];
  
  // Apply filters
  if (filters.value.status) {
    result = result.filter(task => task.status === filters.value.status)
  }
  if (filters.value.type) {
    result = result.filter(task => task.type === filters.value.type)
  }
  if (filters.value.priority) {
    result = result.filter(task => task.priority === filters.value.priority)
  }
  if (filters.value.assigneeId) {
    result = result.filter(task => task.assigneeId === filters.value.assigneeId)
  }
  if (filters.value.clientId) {
      result = result.filter(task => projectClientMap[task.projectId] === filters.value.clientId);
  }
  if (filters.value.projectId) {
      result = result.filter(task => task.projectId === filters.value.projectId)
  }
  
  // Apply sorting
  result.sort((a, b) => {
    const field = filters.value.sortBy
    const valA = a[field];
    const valB = b[field];

    if (field === 'dueDate' || field === 'createdAt') {
        // Handle null dates - potentially push them to the end
        const dateA = valA ? new Date(valA).getTime() : Infinity;
        const dateB = valB ? new Date(valB).getTime() : Infinity;
        return dateA - dateB;
    }
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB)
    }
    
    // Fallback for other types (numbers, booleans)
    if (valA < valB) return -1;
    if (valA > valB) return 1;
    return 0;
  });
  
  // Limit the number of tasks shown to prevent performance issues
  const MAX_TASKS = 100;
  if (result.length > MAX_TASKS) {
    return result.slice(0, MAX_TASKS);
  }
  
  return result
})

// Methods
const fetchTasks = async () => {
  isLoading.value = true
  try {
    await taskStore.fetchTasks()
  } catch (error) {
    toast.error('Failed to load tasks. Please try again.')
    // Ensure loading is stopped even on error
    isLoading.value = false; 
  } finally {
    // isLoading is set false here too, but catch might exit first
    isLoading.value = false
  }
}

const fetchSupportData = async () => {
  // Fetch projects, clients, and team members needed for filtering
  // Use allSettled so one failing call doesn't block the others
  const results = await Promise.allSettled([
      projectStore.fetchProjects(),
      clientStore.fetchClients(),
      teamStore.fetchTeamMembers()
  ]);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      toast.error('Failed to load filter data. Please try again.');
    }
  });
}

// Modal Open Handlers
const openNewTaskModal = () => {
  currentTaskForEdit.value = { // Reset to default structure for a new task
    title: '',
    description: '',
    type: 'Development',
    status: 'To Do',
    priority: 'medium',
    assigneeId: null,
    tags: [],
    dueDate: new Date().toISOString().split('T')[0], // Default to today
    projectId: filters.value.projectId || null, // Pre-fill if project filter is active
    checklist: []
  };
  showTaskFormModal.value = true
}

const handleEditTask = (task) => {
  currentTaskForEdit.value = task // Pass the task object to the form
  showTaskFormModal.value = true
}

const handleConfirmDeleteTask = (task) => {
  taskToDelete.value = task
  showDeleteModal.value = true
}

const handleOpenChecklist = (task) => {
    currentTaskForChecklist.value = task;
    showChecklistModal.value = true;
}

// CRUD Operation Handlers
const handleSaveTask = async (taskData) => {
  isSavingTask.value = true;
  
  try {
    // Ensure the task has required properties
    const taskToSave = {
      ...taskData,
      // Set defaults for any missing properties
      checklist: taskData.checklist || []
    };
    
    if (taskData.id) { 
      // Existing task ID means update
      await taskStore.updateTask(taskToSave);
      toast.success(`Task "${taskData.title}" updated.`);
    } else {
      // No ID means create
      await taskStore.createTask(taskToSave);
      toast.success(`Task "${taskData.title}" created.`);
    }
    
    showTaskFormModal.value = false;
  } catch (error) {
    // Extract the actual error message from the error object if available
    let errorMessage = 'Unknown error';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error) {
      errorMessage = error.error;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    toast.error(`Failed to save task: ${errorMessage}`);
  } finally {
    isSavingTask.value = false;
  }
}

const handleDeleteTask = async () => {
  if (!taskToDelete.value) return
  isDeletingTask.value = true
  try {
    await taskStore.deleteTask(taskToDelete.value.id)
    toast.success(`Task "${taskToDelete.value.title}" deleted.`) 
    showDeleteModal.value = false
    taskToDelete.value = null // Clear selection
  } catch (error) {
    toast.error(`Failed to delete task: ${error.message || 'Unknown error'}`)
  } finally {
    isDeletingTask.value = false
  }
}

const handleUpdateTaskStatus = async ({ taskId, status }) => {
  const task = tasks.value.find(t => t.id === taskId)
  if (task) {
    // Optimistic update (optional but improves UX)
    // const originalStatus = task.status;
    // task.status = status;
    try {
      await taskStore.updateTask({ ...task, status })
      // toast.info(`Task "${task.title}" status updated to ${status}.`); // Optional toast for status change
    } catch (error) {
      toast.error(`Failed to update task status: ${error.message || 'Unknown error'}`)
      // Revert optimistic update on failure
      // task.status = originalStatus; 
    }
  }
}

const handleUpdateChecklist = async (newChecklist) => {
    if (!currentTaskForChecklist.value) return;
    try {
        await taskStore.updateTask({ 
            ...currentTaskForChecklist.value, 
            checklist: newChecklist 
        });
        // Optionally add a toast confirmation
        // toast.success("Checklist updated.");
    } catch (error) {
        toast.error(`Failed to update checklist: ${error.message || 'Unknown error'}`);
    }
}

// Lifecycle
onMounted(async () => {
  await fetchTasks() // Load tasks first
  await fetchSupportData() // Load projects and clients needed for filtering
})
</script>

<style scoped>
</style>