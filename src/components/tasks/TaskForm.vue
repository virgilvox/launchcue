<template>
  <form @submit.prevent="submitForm" class="space-y-4">
    <div class="form-group">
      <label for="task-title" class="form-label">Title</label>
      <input 
        id="task-title" 
        v-model="editableTask.title" 
        type="text" 
        class="form-input" 
        required
      />
    </div>
    
    <div class="form-group">
      <label for="task-description" class="form-label">Description</label>
      <textarea 
        id="task-description" 
        v-model="editableTask.description" 
        class="form-textarea" 
        rows="3"
      ></textarea>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label for="task-type" class="form-label">Type</label>
        <select 
          id="task-type" 
          v-model="editableTask.type" 
          class="form-select"
        >
          <option value="Design">Design</option>
          <option value="Development">Development</option>
          <option value="Documentation">Documentation</option>
          <option value="Community">Community</option>
          <option value="Meeting">Meeting</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="task-status" class="form-label">Status</label>
        <select 
          id="task-status" 
          v-model="editableTask.status" 
          class="form-select"
        >
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label for="task-priority" class="form-label">Priority</label>
        <select
          id="task-priority"
          v-model="editableTask.priority"
          class="form-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div class="form-group">
        <label for="task-assignee" class="form-label">Assignee</label>
        <select
          id="task-assignee"
          v-model="editableTask.assigneeId"
          class="form-select"
        >
          <option :value="null">Unassigned</option>
          <option v-for="member in teamMembers" :key="member.id" :value="member.id">
            {{ member.displayName || member.email }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-group">
        <label for="task-due-date" class="form-label">Due Date</label>
        <input
          id="task-due-date"
          v-model="editableTask.dueDate"
          type="date"
          class="form-input"
        />
      </div>

      <div class="form-group">
        <label for="task-project" class="form-label">Project</label>
        <select
          id="task-project"
          v-model="editableTask.projectId"
          class="form-select"
        >
          <option :value="null">None</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.title }}
          </option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label for="task-tags" class="form-label">Tags</label>
      <input
        id="task-tags"
        v-model="tagsInput"
        type="text"
        class="form-input"
        placeholder="Enter tags separated by commas"
      />
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Separate multiple tags with commas</p>
    </div>

    <div class="form-actions">
      <button type="button" @click="cancel" class="btn-outline">
        Cancel
      </button>
      <button type="submit" class="btn-primary" :disabled="isSaving">
        {{ isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create') + ' Task' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useProjectStore } from '../../stores/project';
import { useTeamStore } from '../../stores/team';

const props = defineProps({
  task: { // The task object to edit, or null/default for new task
    type: Object,
    default: () => ({
        title: '',
        description: '',
        type: 'Development',
        status: 'To Do',
        priority: 'medium',
        assigneeId: null,
        tags: [],
        dueDate: '',
        projectId: null,
        checklist: []
    })
  },
  isSaving: { // Prop to indicate if saving is in progress
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['save', 'cancel']);

const projectStore = useProjectStore();
const teamStore = useTeamStore();
const projects = computed(() => projectStore.projects);
const teamMembers = computed(() => teamStore.validTeamMembers);

// Create a reactive copy of the task prop to avoid mutating it directly
const editableTask = ref({ ...props.task });

// Tags input as comma-separated string
const tagsInput = ref('');

// Computed property to determine if we are editing an existing task
const isEditing = computed(() => !!props.task?.id);

// Watch the prop to update the local state if the task changes (e.g., opening edit modal again)
watch(() => props.task, (newTask) => {
  editableTask.value = {
      ...newTask,
      priority: newTask?.priority || 'medium',
      assigneeId: newTask?.assigneeId || null,
      tags: newTask?.tags || [],
      // Ensure date format is correct for input type="date"
      dueDate: newTask?.dueDate ? new Date(newTask.dueDate).toISOString().split('T')[0] : ''
  };
  tagsInput.value = (newTask?.tags || []).join(', ');
}, { deep: true, immediate: true });

// Fetch team members if not already loaded
if (teamMembers.value.length === 0) {
  teamStore.fetchTeamMembers();
}


const submitForm = () => {
  // Create a copy of the task to avoid mutating the original
  const taskToSave = {
    ...editableTask.value,
  };

  // Format the date appropriately
  if (taskToSave.dueDate) {
    // Keep it as a date string in YYYY-MM-DD format
    // The store will convert to ISO if needed
  } else {
    // Ensure null if no date is selected
    taskToSave.dueDate = null;
  }

  // Ensure type and status are set
  if (!taskToSave.type) taskToSave.type = 'Development';
  if (!taskToSave.status) taskToSave.status = 'To Do';

  // Ensure priority is set
  if (!taskToSave.priority) taskToSave.priority = 'medium';

  // Parse tags from comma-separated input
  taskToSave.tags = tagsInput.value
    ? tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];

  // Initialize checklist if missing
  if (!taskToSave.checklist) taskToSave.checklist = [];

  emit('save', taskToSave);
};

const cancel = () => {
  emit('cancel');
};

// Fetch projects if not already loaded (might be redundant if Tasks.vue does it)
// if (projects.value.length === 0) {
//   projectStore.fetchProjects(); 
// }
</script>

<style scoped>
/* Scoped styles if needed, otherwise rely on main.css */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 