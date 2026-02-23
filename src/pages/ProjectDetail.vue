<template>
  <PageContainer>
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading project details...</p>
    </div>

    <div v-else-if="!project" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Project not found</p>
      <router-link to="/projects" class="btn btn-primary mt-4">Back to Projects</router-link>
    </div>

    <template v-else>
      <PageHeader
        :breadcrumbs="breadcrumbItems"
        :backTo="backRoute"
        :title="projectTitle"
      >
        <template #actions>
          <span :class="`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`">
            {{ project.status }}
          </span>
          <span v-if="project.client" class="text-gray-600 dark:text-gray-400">
            Client:
            <router-link
              :to="`/clients/${project.clientId}`"
              class="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {{ project.client.name }}
            </router-link>
          </span>
          <router-link
            :to="`/projects/${project.id}/edit`"
            class="btn btn-secondary"
          >
            Edit Project
          </router-link>
          <button @click="confirmDeleteProject" class="btn btn-danger">
            Delete
          </button>
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Main content -->
        <div class="lg:col-span-2 space-y-6">
          <ProjectDetailsCard
            :project="project"
            :deadlineNear="isDeadlineNear(project.dueDate)"
          />

          <ProjectTasksSection
            :tasks="projectTasks"
            :loading="tasksLoading"
            :search="taskSearch"
            @update:search="taskSearch = $event"
            @add-task="openAddTaskModal"
            @edit-task="editTask"
            @delete-task="deleteTask"
            @toggle-task="toggleTaskCompletion"
          />
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <ProjectTeamSection
            :members="project.teamMembers"
            @add-member="openAddTeamMemberModal"
            @remove-member="removeTeamMember"
          />

          <ProjectStatsCard
            :completionPercentage="taskCompletionPercentage"
            :completedCount="completedTasksCount"
            :totalCount="totalTasksCount"
            :timelinePercentage="projectTimelinePercentage"
            :currentTimelinePercentage="currentTimelinePercentage"
            :startDate="project.startDate"
            :endDate="project.endDate"
          />
        </div>
      </div>
    </template>

    <!-- Add/Edit Task Modal -->
    <div v-if="taskModal.isOpen.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          {{ taskModal.editingItem.value ? 'Edit Task' : 'Add Task' }}
        </h3>

        <form @submit.prevent="saveTask">
          <div class="mb-4">
            <label for="taskTitle" class="label">Title <span class="text-red-500">*</span></label>
            <input
              id="taskTitle"
              v-model="taskModal.formData.value.title"
              type="text"
              class="input"
              placeholder="Task title"
              required
            />
          </div>

          <div class="mb-4">
            <label for="taskDescription" class="label">Description</label>
            <textarea
              id="taskDescription"
              v-model="taskModal.formData.value.description"
              class="input"
              placeholder="Task description"
              rows="3"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="taskDueDate" class="label">Due Date</label>
              <input
                id="taskDueDate"
                v-model="taskModal.formData.value.dueDate"
                type="date"
                class="input"
              />
            </div>

            <div>
              <label for="taskPriority" class="label">Priority</label>
              <select
                id="taskPriority"
                v-model="taskModal.formData.value.priority"
                class="input"
              >
                <option value="">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label for="taskAssignee" class="label">Assigned To</label>
            <select
              id="taskAssignee"
              v-model="taskModal.formData.value.assigneeId"
              class="input"
            >
              <option value="">Unassigned</option>
              <option v-for="member in project.teamMembers" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="taskModal.close()"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="taskModal.isLoading.value"
            >
              {{ taskModal.isLoading.value ? 'Saving...' : 'Save Task' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Team Member Modal -->
    <div v-if="teamMemberModal.isOpen.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Add Team Member</h3>

        <form @submit.prevent="saveTeamMember">
          <div class="mb-4">
            <label for="memberName" class="label">Name <span class="text-red-500">*</span></label>
            <input
              id="memberName"
              v-model="teamMemberModal.formData.value.name"
              type="text"
              class="input"
              placeholder="Team member name"
              required
            />
          </div>

          <div class="mb-4">
            <label for="memberRole" class="label">Role <span class="text-red-500">*</span></label>
            <input
              id="memberRole"
              v-model="teamMemberModal.formData.value.role"
              type="text"
              class="input"
              placeholder="e.g. Developer, Designer, Project Manager"
              required
            />
          </div>

          <div class="mb-4">
            <label for="memberEmail" class="label">Email</label>
            <input
              id="memberEmail"
              v-model="teamMemberModal.formData.value.email"
              type="email"
              class="input"
              placeholder="email@example.com"
            />
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="teamMemberModal.close()"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="teamMemberModal.isLoading.value"
            >
              {{ teamMemberModal.isLoading.value ? 'Saving...' : 'Add Member' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Project Confirmation Modal -->
    <div v-if="deleteDialog.isOpen.value" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this project? This action cannot be undone and will also delete all tasks and team member associations.
        </p>

        <div class="flex justify-end space-x-3">
          <button
            @click="deleteDialog.cancel()"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            @click="deleteDialog.confirm()"
            class="btn btn-danger"
            :disabled="deleteDialog.isProcessing.value"
          >
            {{ deleteDialog.isProcessing.value ? 'Deleting...' : 'Delete Project' }}
          </button>
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../stores/auth'
import { useModalState } from '@/composables/useModalState'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import projectService from '@/services/project.service'
import taskService from '@/services/task.service'
import PageContainer from '@/components/ui/PageContainer.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import ProjectDetailsCard from '@/components/project/ProjectDetailsCard.vue'
import ProjectTasksSection from '@/components/project/ProjectTasksSection.vue'
import ProjectTeamSection from '@/components/project/ProjectTeamSection.vue'
import ProjectStatsCard from '@/components/project/ProjectStatsCard.vue'
import { getStatusColor } from '@/utils/statusColors'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

// State
const loading = ref(true)
const error = ref(null)
const project = ref(null)
const taskSearch = ref('')
const projectTasks = ref([])
const tasksLoading = ref(false)

// Modal composables
const taskModal = useModalState(() => ({
  title: '',
  description: '',
  dueDate: '',
  priority: '',
  assigneeId: '',
  completed: false,
}))

const teamMemberModal = useModalState(() => ({
  name: '',
  role: '',
  email: '',
}))

const deleteDialog = useConfirmDialog()

// Computed properties
const projectTitle = computed(() => {
  return project.value?.name || project.value?.title || 'Untitled Project'
})

const backRoute = computed(() => {
  if (!project.value) return '/projects'
  return project.value.clientId ? `/clients/${project.value.clientId}` : '/projects'
})

const completedTasksCount = computed(() => {
  if (!projectTasks.value) return 0
  return projectTasks.value.filter(task => task.completed).length
})

const totalTasksCount = computed(() => {
  if (!projectTasks.value) return 0
  return projectTasks.value.length
})

const taskCompletionPercentage = computed(() => {
  if (totalTasksCount.value === 0) return 0
  return Math.round((completedTasksCount.value / totalTasksCount.value) * 100)
})

const projectTimelinePercentage = computed(() => {
  if (!project.value || !project.value.startDate || !project.value.endDate) return 0

  const startDate = new Date(project.value.startDate)
  const endDate = new Date(project.value.endDate)
  const totalDuration = endDate - startDate

  if (totalDuration <= 0) return 100
  return 100
})

const breadcrumbItems = computed(() => [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Projects', to: '/projects' },
  { label: projectTitle.value },
])

const currentTimelinePercentage = computed(() => {
  if (!project.value || !project.value.startDate || !project.value.endDate) return 0

  const startDate = new Date(project.value.startDate)
  const endDate = new Date(project.value.endDate)
  const currentDate = new Date()
  const totalDuration = endDate - startDate

  if (totalDuration <= 0) return 100

  if (currentDate < startDate) return 0
  if (currentDate > endDate) return 100

  const elapsedDuration = currentDate - startDate
  return Math.round((elapsedDuration / totalDuration) * 100)
})

// Check if deadline is near or past
function isDeadlineNear(dateString) {
  if (!dateString) return false

  const deadline = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return deadline <= today ||
    (deadline - today) / (1000 * 60 * 60 * 24) <= 3
}

// Load project data
async function loadProject() {
  loading.value = true
  error.value = null

  try {
    const projectId = route.params.id
    project.value = await projectService.getProject(projectId)

    await loadProjectTasks(projectId)
  } catch (err) {
    console.error('Error loading project:', err)
    error.value = 'Failed to load project details. Please try again.'
  } finally {
    loading.value = false
  }
}

// Load project tasks
async function loadProjectTasks(projectId) {
  tasksLoading.value = true

  try {
    projectTasks.value = await taskService.getProjectTasks(projectId)
  } catch (err) {
    console.error('Error loading project tasks:', err)
    toast.error('Failed to load project tasks')
  } finally {
    tasksLoading.value = false
  }
}

// Toggle task completion
async function toggleTaskCompletion(task) {
  try {
    const updatedTask = {
      ...task,
      completed: !task.completed,
      status: !task.completed ? 'Done' : 'To Do',
    }

    await taskService.updateTask(task.id, updatedTask)

    const index = projectTasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      projectTasks.value[index].completed = !task.completed
      projectTasks.value[index].status = !task.completed ? 'Done' : 'To Do'
    }

    toast.success(`Task marked as ${updatedTask.completed ? 'completed' : 'incomplete'}`)
  } catch (err) {
    console.error('Error toggling task completion:', err)
    toast.error('Failed to update task status')
  }
}

// Open add task modal
function openAddTaskModal() {
  taskModal.open()
}

// Open edit task modal
function editTask(task) {
  taskModal.open(task)
  taskModal.formData.value = {
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate || '',
    priority: task.priority || '',
    assigneeId: task.assigneeId || '',
    completed: task.completed,
  }
}

// Save task
async function saveTask() {
  taskModal.setLoading(true)

  try {
    let formattedDueDate = null
    if (taskModal.formData.value.dueDate) {
      formattedDueDate = new Date(taskModal.formData.value.dueDate).toISOString()
    }

    const taskData = {
      title: taskModal.formData.value.title,
      description: taskModal.formData.value.description || '',
      dueDate: formattedDueDate,
      priority: taskModal.formData.value.priority || 'Medium',
      assigneeId: taskModal.formData.value.assigneeId || null,
      completed: taskModal.formData.value.completed || false,
      status: taskModal.formData.value.completed ? 'Done' : 'To Do',
      projectId: project.value.id,
    }

    console.log('Saving task with data:', taskData)

    if (taskModal.editingItem.value) {
      const updatedTask = await taskService.updateTask(taskModal.editingItem.value.id, taskData)

      const index = projectTasks.value.findIndex(t => t.id === taskModal.editingItem.value.id)
      if (index !== -1) {
        projectTasks.value[index] = updatedTask
      }

      toast.success('Task updated successfully')
    } else {
      const newTask = await taskService.createTask(project.value.id, taskData)

      if (newTask) {
        projectTasks.value.push(newTask)
        toast.success('Task added successfully')
      }
    }

    taskModal.close()
  } catch (err) {
    console.error('Error saving task:', err)
    toast.error(`Failed to save task: ${err.message || 'Unknown error'}`)
  } finally {
    taskModal.setLoading(false)
  }
}

// Delete task
async function deleteTask(task) {
  try {
    await taskService.deleteTask(task.id)

    const index = projectTasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      projectTasks.value.splice(index, 1)
    }

    toast.success('Task deleted successfully')
  } catch (err) {
    console.error('Error deleting task:', err)
    toast.error('Failed to delete task')
  }
}

// Open add team member modal
function openAddTeamMemberModal() {
  teamMemberModal.open()
}

// Save team member
async function saveTeamMember() {
  teamMemberModal.setLoading(true)

  try {
    const memberData = {
      name: teamMemberModal.formData.value.name,
      role: teamMemberModal.formData.value.role,
      email: teamMemberModal.formData.value.email,
    }

    const result = await projectService.addTeamMember(project.value.id, memberData)

    if (!project.value.teamMembers) {
      project.value.teamMembers = []
    }

    project.value.teamMembers.push(result)
    toast.success('Team member added successfully')

    teamMemberModal.close()
  } catch (err) {
    console.error('Error adding team member:', err)
    toast.error('Failed to add team member')
  } finally {
    teamMemberModal.setLoading(false)
  }
}

// Remove team member
async function removeTeamMember(member) {
  try {
    await projectService.removeTeamMember(project.value.id, member.id)

    const index = project.value.teamMembers.findIndex(m => m.id === member.id)
    if (index !== -1) {
      project.value.teamMembers.splice(index, 1)
    }

    toast.success('Team member removed successfully')
  } catch (err) {
    console.error('Error removing team member:', err)
    toast.error('Failed to remove team member')
  }
}

// Confirm and delete project
async function confirmDeleteProject() {
  const confirmed = await deleteDialog.requestConfirm(project.value)
  if (confirmed) {
    await executeDeleteProject()
  }
}

async function executeDeleteProject() {
  try {
    await projectService.deleteProject(project.value.id)

    toast.success('Project deleted successfully')

    if (project.value.clientId) {
      router.push(`/clients/${project.value.clientId}`)
    } else {
      router.push('/projects')
    }
  } catch (err) {
    console.error('Error deleting project:', err)
    toast.error('Failed to delete project')
  } finally {
    deleteDialog.done()
  }
}

// Initialize the component
onMounted(() => {
  loadProject()
})
</script>
