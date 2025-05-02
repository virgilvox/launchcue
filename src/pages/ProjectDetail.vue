<template>
  <div>
    <div v-if="loading" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Loading project details...</p>
    </div>
    
    <div v-else-if="!project" class="text-center py-10">
      <p class="text-gray-500 dark:text-gray-400">Project not found</p>
      <router-link to="/projects" class="btn btn-primary mt-4">Back to Projects</router-link>
    </div>
    
    <div v-else>
      <!-- Project Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div class="flex items-center gap-3">
            <router-link 
              :to="project.clientId ? `/clients/${project.clientId}` : '/projects'" 
              class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
            </router-link>
            <h2 class="text-2xl font-bold text-gray-800 dark:text-white">{{ project.name || project.title || 'Untitled Project' }}</h2>
          </div>
          <div class="flex items-center mt-2">
            <span :class="`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`">
              {{ project.status }}
            </span>
            <span v-if="project.client" class="ml-3 text-gray-600 dark:text-gray-400">
              Client: 
              <router-link 
                :to="`/clients/${project.clientId}`" 
                class="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {{ project.client.name }}
              </router-link>
            </span>
          </div>
        </div>
        
        <div class="flex gap-3">
          <router-link 
            :to="`/projects/${project.id}/edit`" 
            class="btn btn-secondary"
          >
            Edit Project
          </router-link>
          <button @click="confirmDeleteProject" class="btn btn-danger">
            Delete
          </button>
        </div>
      </div>
      
      <!-- Project Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Project Details</h3>
            
            <div class="space-y-4">
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h4>
                <p class="text-gray-800 dark:text-white whitespace-pre-line">
                  {{ project.description || 'No description available' }}
                </p>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h4>
                  <p class="text-gray-800 dark:text-white">
                    {{ formatDate(project.startDate) }}
                  </p>
                </div>
                
                <div>
                  <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {{ project.dueDate ? 'Deadline' : 'End Date' }}
                  </h4>
                  <p class="text-gray-800 dark:text-white" 
                     :class="{'text-red-600 dark:text-red-400': isDeadlineNear(project.dueDate)}">
                    {{ formatDate(project.dueDate || project.endDate) }}
                  </p>
                </div>
              </div>
              
              <div v-if="project.tags && project.tags.length > 0">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tags</h4>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="tag in project.tags" 
                    :key="tag"
                    class="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Tasks Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Tasks</h3>
              <button @click="openAddTaskModal" class="btn btn-primary btn-sm">
                Add Task
              </button>
            </div>
            
            <div v-if="tasksLoading" class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400">Loading tasks...</p>
            </div>
            
            <div v-else-if="!projectTasks || projectTasks.length === 0" class="text-center py-6">
              <p class="text-gray-500 dark:text-gray-400">No tasks found for this project</p>
              <button @click="openAddTaskModal" class="text-primary-600 dark:text-primary-400 hover:underline mt-2">
                Add your first task
              </button>
            </div>
            
            <div v-else>
              <div class="mb-4">
                <input 
                  v-model="taskSearch"
                  type="text"
                  class="input w-full"
                  placeholder="Search tasks..."
                />
              </div>
              
              <div class="space-y-3">
                <div
                  v-for="task in filteredTasks"
                  :key="task.id"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-start">
                      <input 
                        type="checkbox"
                        :checked="task.completed"
                        @change="toggleTaskCompletion(task)"
                        class="mt-1 mr-3 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <div>
                        <h4 
                          class="text-base font-medium"
                          :class="task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'"
                        >
                          {{ task.title }}
                        </h4>
                        <p 
                          v-if="task.description"
                          class="text-sm mt-1"
                          :class="task.completed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'"
                        >
                          {{ task.description }}
                        </p>
                        <div class="flex items-center mt-2">
                          <span 
                            v-if="task.dueDate"
                            class="text-xs"
                            :class="getTaskDueDateClasses(task)"
                          >
                            Due: {{ formatDate(task.dueDate) }}
                          </span>
                          <span 
                            v-if="task.priority"
                            :class="`ml-3 px-2 py-0.5 rounded-full text-xs ${getTaskPriorityColor(task.priority)}`"
                          >
                            {{ task.priority }}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex gap-2">
                      <button @click="editTask(task)" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button @click="deleteTask(task)" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <!-- Team Members Section -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Team Members</h3>
              <button @click="openAddTeamMemberModal" class="btn btn-primary btn-sm">
                Add
              </button>
            </div>
            
            <div v-if="!project.teamMembers || project.teamMembers.length === 0" class="text-center py-4">
              <p class="text-gray-500 dark:text-gray-400">No team members assigned</p>
            </div>
            
            <div v-else class="space-y-3">
              <div 
                v-for="member in project.teamMembers" 
                :key="member.id"
                class="flex items-center justify-between"
              >
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center">
                    {{ getInitials(member.name) }}
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-800 dark:text-white">{{ member.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ member.role }}</p>
                  </div>
                </div>
                <button @click="removeTeamMember(member)" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Project Stats -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">Project Stats</h3>
            
            <div class="space-y-6">
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Task Completion</h4>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div 
                    class="bg-primary-600 h-2.5 rounded-full" 
                    :style="`width: ${taskCompletionPercentage}%`"
                  ></div>
                </div>
                <div class="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ taskCompletionPercentage }}% complete</span>
                  <span>{{ completedTasksCount }} / {{ totalTasksCount }} tasks</span>
                </div>
              </div>
              
              <div>
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Timeline</h4>
                <div class="space-y-2">
                  <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500 dark:text-gray-400">Start</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">End</span>
                  </div>
                  <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 relative">
                    <div 
                      class="bg-primary-600 h-2.5 rounded-full" 
                      :style="`width: ${projectTimelinePercentage}%`"
                    ></div>
                    <div
                      class="absolute w-3 h-3 bg-red-500 rounded-full -top-0.5"
                      :style="`left: calc(${currentTimelinePercentage}% - 6px)`"
                    ></div>
                  </div>
                  <div class="flex justify-between text-xs">
                    <span class="text-gray-800 dark:text-white">{{ formatDateShort(project.startDate) }}</span>
                    <span class="text-gray-800 dark:text-white">{{ formatDateShort(project.endDate) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Task Modal -->
    <div v-if="showTaskModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          {{ editingTask ? 'Edit Task' : 'Add Task' }}
        </h3>
        
        <form @submit.prevent="saveTask">
          <div class="mb-4">
            <label for="taskTitle" class="label">Title <span class="text-red-500">*</span></label>
            <input 
              id="taskTitle"
              v-model="taskForm.title"
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
              v-model="taskForm.description"
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
                v-model="taskForm.dueDate"
                type="date"
                class="input"
              />
            </div>
            
            <div>
              <label for="taskPriority" class="label">Priority</label>
              <select 
                id="taskPriority"
                v-model="taskForm.priority"
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
              v-model="taskForm.assigneeId"
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
              @click="closeTaskModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="savingTask"
            >
              {{ savingTask ? 'Saving...' : 'Save Task' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Add Team Member Modal -->
    <div v-if="showTeamMemberModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Add Team Member</h3>
        
        <form @submit.prevent="saveTeamMember">
          <div class="mb-4">
            <label for="memberName" class="label">Name <span class="text-red-500">*</span></label>
            <input 
              id="memberName"
              v-model="teamMemberForm.name"
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
              v-model="teamMemberForm.role"
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
              v-model="teamMemberForm.email"
              type="email"
              class="input"
              placeholder="email@example.com"
            />
          </div>
          
          <div class="flex justify-end space-x-3">
            <button 
              type="button"
              @click="closeTeamMemberModal"
              class="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="savingTeamMember"
            >
              {{ savingTeamMember ? 'Saving...' : 'Add Member' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Delete Project Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold text-gray-800 dark:text-white mb-4">Confirm Delete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete this project? This action cannot be undone and will also delete all tasks and team member associations.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button 
            @click="closeDeleteModal"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button 
            @click="deleteProject"
            class="btn btn-danger"
            :disabled="deleting"
          >
            {{ deleting ? 'Deleting...' : 'Delete Project' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '../composables/useToast';
import { useAuthStore } from '../stores/auth';
import projectService from '@/services/project.service';
import taskService from '@/services/task.service';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

// State
const loading = ref(true);
const error = ref(null);
const project = ref(null);
const showTaskModal = ref(false);
const showTeamMemberModal = ref(false);
const showDeleteModal = ref(false);
const editingTask = ref(null);
const savingTask = ref(false);
const savingTeamMember = ref(false);
const deleting = ref(false);
const taskSearch = ref('');
const projectTasks = ref([]);
const tasksLoading = ref(false);

const taskForm = ref({
  title: '',
  description: '',
  dueDate: '',
  priority: '',
  assigneeId: '',
  completed: false
});

const teamMemberForm = ref({
  name: '',
  role: '',
  email: ''
});

// Computed properties
const filteredTasks = computed(() => {
  if (!projectTasks.value) return [];
  
  const searchTerm = taskSearch.value.toLowerCase();
  
  return projectTasks.value.filter(task => {
    return (
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description && task.description.toLowerCase().includes(searchTerm))
    );
  });
});

const completedTasksCount = computed(() => {
  if (!projectTasks.value) return 0;
  return projectTasks.value.filter(task => task.completed).length;
});

const totalTasksCount = computed(() => {
  if (!projectTasks.value) return 0;
  return projectTasks.value.length;
});

const taskCompletionPercentage = computed(() => {
  if (totalTasksCount.value === 0) return 0;
  return Math.round((completedTasksCount.value / totalTasksCount.value) * 100);
});

const projectTimelinePercentage = computed(() => {
  if (!project.value || !project.value.startDate || !project.value.endDate) return 0;
  
  const startDate = new Date(project.value.startDate);
  const endDate = new Date(project.value.endDate);
  const totalDuration = endDate - startDate;
  
  if (totalDuration <= 0) return 100;
  return 100;
});

const currentTimelinePercentage = computed(() => {
  if (!project.value || !project.value.startDate || !project.value.endDate) return 0;
  
  const startDate = new Date(project.value.startDate);
  const endDate = new Date(project.value.endDate);
  const currentDate = new Date();
  const totalDuration = endDate - startDate;
  
  if (totalDuration <= 0) return 100;
  
  if (currentDate < startDate) return 0;
  if (currentDate > endDate) return 100;
  
  const elapsedDuration = currentDate - startDate;
  return Math.round((elapsedDuration / totalDuration) * 100);
});

// Load project data
async function loadProject() {
  loading.value = true;
  error.value = null;
  
  try {
    const projectId = route.params.id;
    project.value = await projectService.getProject(projectId);
    
    // Load tasks for this project
    await loadProjectTasks(projectId);
    
  } catch (err) {
    console.error('Error loading project:', err);
    error.value = 'Failed to load project details. Please try again.';
  } finally {
    loading.value = false;
  }
}

// Load project tasks
async function loadProjectTasks(projectId) {
  tasksLoading.value = true;
  
  try {
    projectTasks.value = await taskService.getProjectTasks(projectId);
  } catch (err) {
    console.error('Error loading project tasks:', err);
    toast.error('Failed to load project tasks');
  } finally {
    tasksLoading.value = false;
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

// Format date (short)
function formatDateShort(dateString) {
  if (!dateString) return 'Not set';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric' 
  }).format(date);
}

// Get initials from a name
function getInitials(name) {
  if (!name) return '';
  
  const parts = name.split(' ');
  
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get status color
function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'in progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'planned':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

// Get task due date classes
function getTaskDueDateClasses(task) {
  if (!task.dueDate) return 'text-gray-500 dark:text-gray-400';
  
  const dueDate = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (task.completed) {
    return 'text-gray-500 dark:text-gray-400';
  } else if (dueDate < today) {
    return 'text-red-600 dark:text-red-400';
  } else if (dueDate.getTime() === today.getTime()) {
    return 'text-orange-600 dark:text-orange-400';
  } else {
    return 'text-gray-600 dark:text-gray-400';
  }
}

// Check if deadline is near or past
function isDeadlineNear(dateString) {
  if (!dateString) return false;
  
  const deadline = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if deadline is today or in the past
  return deadline <= today || 
    // Or within 3 days
    (deadline - today) / (1000 * 60 * 60 * 24) <= 3;
}

// Get task priority color
function getTaskPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'medium':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

// Toggle task completion
async function toggleTaskCompletion(task) {
  try {
    const updatedTask = { 
      ...task, 
      completed: !task.completed,
      status: !task.completed ? 'Done' : 'To Do' 
    };
    
    await taskService.updateTask(task.id, updatedTask);
    
    // Update local task data
    const index = projectTasks.value.findIndex(t => t.id === task.id);
    if (index !== -1) {
      projectTasks.value[index].completed = !task.completed;
      projectTasks.value[index].status = !task.completed ? 'Done' : 'To Do';
    }
    
    toast.success(`Task marked as ${updatedTask.completed ? 'completed' : 'incomplete'}`);
  } catch (err) {
    console.error('Error toggling task completion:', err);
    toast.error('Failed to update task status');
  }
}

// Open add task modal
function openAddTaskModal() {
  editingTask.value = null;
  taskForm.value = {
    title: '',
    description: '',
    dueDate: '',
    priority: '',
    assigneeId: '',
    completed: false
  };
  
  showTaskModal.value = true;
}

// Open edit task modal
function editTask(task) {
  editingTask.value = task;
  taskForm.value = {
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate || '',
    priority: task.priority || '',
    assigneeId: task.assigneeId || '',
    completed: task.completed
  };
  
  showTaskModal.value = true;
}

// Close task modal
function closeTaskModal() {
  showTaskModal.value = false;
}

// Save task
async function saveTask() {
  savingTask.value = true;
  
  try {
    // Format the date to ISO string format if present
    let formattedDueDate = null;
    if (taskForm.value.dueDate) {
      formattedDueDate = new Date(taskForm.value.dueDate).toISOString();
    }
    
    const taskData = {
      title: taskForm.value.title,
      description: taskForm.value.description || '',
      dueDate: formattedDueDate,
      priority: taskForm.value.priority || 'Medium',
      assigneeId: taskForm.value.assigneeId || null,
      completed: taskForm.value.completed || false,
      status: taskForm.value.completed ? 'Done' : 'To Do',
      projectId: project.value.id
    };
    
    console.log('Saving task with data:', taskData);
    
    if (editingTask.value) {
      // Update existing task
      const updatedTask = await taskService.updateTask(editingTask.value.id, taskData);
      
      // Update local state
      const index = projectTasks.value.findIndex(t => t.id === editingTask.value.id);
      if (index !== -1) {
        projectTasks.value[index] = updatedTask;
      }
      
      toast.success('Task updated successfully');
    } else {
      // Create new task
      const newTask = await taskService.createTask(project.value.id, taskData);
      
      // Add the new task to our list
      if (newTask) {
        projectTasks.value.push(newTask);
        toast.success('Task added successfully');
      }
    }
    
    closeTaskModal();
  } catch (err) {
    console.error('Error saving task:', err);
    toast.error(`Failed to save task: ${err.message || 'Unknown error'}`);
  } finally {
    savingTask.value = false;
  }
}

// Delete task
async function deleteTask(task) {
  try {
    await taskService.deleteTask(task.id);
    
    // Update local state
    const index = projectTasks.value.findIndex(t => t.id === task.id);
    if (index !== -1) {
      projectTasks.value.splice(index, 1);
    }
    
    toast.success('Task deleted successfully');
  } catch (err) {
    console.error('Error deleting task:', err);
    toast.error('Failed to delete task');
  }
}

// Open add team member modal
function openAddTeamMemberModal() {
  teamMemberForm.value = {
    name: '',
    role: '',
    email: ''
  };
  
  showTeamMemberModal.value = true;
}

// Close team member modal
function closeTeamMemberModal() {
  showTeamMemberModal.value = false;
}

// Save team member
async function saveTeamMember() {
  savingTeamMember.value = true;
  
  try {
    const memberData = {
      name: teamMemberForm.value.name,
      role: teamMemberForm.value.role,
      email: teamMemberForm.value.email
    };
    
    // Add member to project
    const result = await projectService.addTeamMember(project.value.id, memberData);
    
    // Update local state
    if (!project.value.teamMembers) {
      project.value.teamMembers = [];
    }
    
    project.value.teamMembers.push(result);
    toast.success('Team member added successfully');
    
    closeTeamMemberModal();
  } catch (err) {
    console.error('Error adding team member:', err);
    toast.error('Failed to add team member');
  } finally {
    savingTeamMember.value = false;
  }
}

// Remove team member
async function removeTeamMember(member) {
  try {
    await projectService.removeTeamMember(project.value.id, member.id);
    
    // Update local state
    const index = project.value.teamMembers.findIndex(m => m.id === member.id);
    if (index !== -1) {
      project.value.teamMembers.splice(index, 1);
    }
    
    toast.success('Team member removed successfully');
  } catch (err) {
    console.error('Error removing team member:', err);
    toast.error('Failed to remove team member');
  }
}

// Confirm delete project
function confirmDeleteProject() {
  showDeleteModal.value = true;
}

// Close delete modal
function closeDeleteModal() {
  showDeleteModal.value = false;
}

// Delete project
async function deleteProject() {
  deleting.value = true;
  
  try {
    await projectService.deleteProject(project.value.id);
    
    toast.success('Project deleted successfully');
    
    // Navigate back to projects or client page
    if (project.value.clientId) {
      router.push(`/clients/${project.value.clientId}`);
    } else {
      router.push('/projects');
    }
  } catch (err) {
    console.error('Error deleting project:', err);
    toast.error('Failed to delete project');
    deleting.value = false;
  }
}

// Initialize the component
onMounted(() => {
  loadProject();
});
</script>