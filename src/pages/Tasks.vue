<template>
  <div class="tasks-page p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
    <div class="page-header flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <p class="text-gray-500 dark:text-gray-400">Manage your tasks and track their progress</p>
      </div>
      <div class="flex items-center gap-2">
        <!-- View Toggle -->
        <div class="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            @click="viewMode = 'list'"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
            title="List view"
          >
            <TableCellsIcon class="h-4 w-4" />
            <span class="hidden sm:inline">List</span>
          </button>
          <button
            @click="viewMode = 'kanban'"
            :class="[
              'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              viewMode === 'kanban'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
            title="Kanban view"
          >
            <ViewColumnsIcon class="h-4 w-4" />
            <span class="hidden sm:inline">Kanban</span>
          </button>
        </div>

        <button @click="openNewTaskModal" class="btn btn-primary">
          <PlusIcon class="h-5 w-5 mr-1" />
          Add Task
        </button>
        <button @click="fetchTasks" class="btn-outline" title="Refresh Tasks">
          <ArrowPathIcon class="h-5 w-5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

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
    <div v-else class="text-center my-12 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div class="mx-auto h-16 w-16 text-gray-400">
        <ClipboardDocumentIcon class="h-16 w-16" />
      </div>
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No tasks found</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        {{ tasks.length > 0 ? 'Try adjusting your filters.' : 'Get started by creating your first task.' }}
      </p>
      <button 
        v-if="tasks.length === 0" 
        @click="openNewTaskModal" 
        class="mt-4 btn btn-primary"
      >
        <PlusIcon class="h-5 w-5 mr-1" />
        Add Task
      </button>
    </div>

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
    <Modal v-model="showDeleteModal" title="Confirm Delete">
      <div v-if="taskToDelete" class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete this task?</p>
        <p class="font-medium text-gray-900 dark:text-gray-100">{{ taskToDelete.title }}</p>
        <p class="text-sm text-red-600">This action cannot be undone.</p>
        
        <div class="form-actions">
          <button type="button" @click="showDeleteModal = false" class="btn-outline">
            Cancel
          </button>
          <button 
            type="button" 
            @click="handleDeleteTask" 
            class="btn-danger" 
            :disabled="isDeletingTask"
           >
            {{ isDeletingTask ? 'Deleting...' : 'Delete Task' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
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
import Modal from '../components/Modal.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import TaskFilters from '../components/tasks/TaskFilters.vue'
import TaskList from '../components/tasks/TaskList.vue'
import TaskForm from '../components/tasks/TaskForm.vue'
import TaskKanban from '../components/tasks/TaskKanban.vue'
import TaskChecklistModal from '../components/tasks/TaskChecklistModal.vue'

// Stores & Toast
const taskStore = useTaskStore()
const projectStore = useProjectStore()
const clientStore = useClientStore()
const teamStore = useTeamStore()
const toast = useToast()

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
    console.error('Failed to fetch tasks:', error)
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
  try {
    // Use Promise.all for concurrent fetching
    await Promise.all([
        projectStore.fetchProjects(),
        clientStore.fetchClients(),
        teamStore.fetchTeamMembers()
    ]);
  } catch (error) {
    console.error('Failed to fetch support data (projects/clients/team members):', error)
    // Decide if toasts are needed here
    // toast.error('Failed to load project/client list for filtering.');
  }
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
    console.error('Error saving task:', error);
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
    console.error('Error deleting task:', error)
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
      console.error('Error updating task status:', error)
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
        console.error('Error updating checklist:', error);
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
.tasks-page {
  /* Add page-specific layout styles if needed */
}

.page-header {
  /* Styles for the header section */
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 