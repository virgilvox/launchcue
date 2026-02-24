<template>
  <div class="bg-[var(--surface-elevated)] border-2 border-[var(--border-light)] p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-[var(--text-primary)]">Tasks</h3>
      <button @click="$emit('add-task')" class="btn btn-primary btn-sm">
        Add Task
      </button>
    </div>

    <div v-if="loading" class="text-center py-4">
      <p class="text-[var(--text-secondary)]">Loading tasks...</p>
    </div>

    <div v-else-if="!tasks || tasks.length === 0" class="text-center py-6">
      <p class="text-[var(--text-secondary)]">No tasks found for this project</p>
      <button @click="$emit('add-task')" class="text-[var(--accent-primary)] hover:underline mt-2">
        Add your first task
      </button>
    </div>

    <div v-else>
      <div class="mb-4">
        <input
          :value="search"
          @input="$emit('update:search', $event.target.value)"
          type="text"
          class="input w-full"
          placeholder="Search tasks..."
        />
      </div>

      <div class="space-y-3">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="border border-[var(--border-light)] p-4 hover:bg-[var(--surface)]"
        >
          <div class="flex items-start justify-between">
            <div class="flex items-start">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="$emit('toggle-task', task)"
                class="mt-1 mr-3 h-4 w-4 text-[var(--accent-primary)] border-[var(--border-light)]"
              />
              <div>
                <h4
                  class="text-base font-medium"
                  :class="task.completed ? 'line-through text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'"
                >
                  {{ task.title }}
                </h4>
                <p
                  v-if="task.description"
                  class="text-sm mt-1"
                  :class="task.completed ? 'text-[var(--text-secondary)]' : 'text-[var(--text-secondary)]'"
                >
                  {{ task.description }}
                </p>
                <div class="flex items-center mt-2">
                  <span
                    v-if="task.dueDate"
                    class="text-xs"
                    :class="getTaskDueDateClasses(task)"
                  >
                    Due: {{ formatDate(task.dueDate) || 'Not set' }}
                  </span>
                  <span
                    v-if="task.priority"
                    :class="`ml-3 px-2 py-0.5 text-xs ${getTaskPriorityColor(task.priority)}`"
                  >
                    {{ task.priority }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <button @click="$emit('edit-task', task)" class="text-[var(--accent-primary)] hover:opacity-80">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button @click="$emit('delete-task', task)" class="text-[var(--danger)] hover:opacity-80">
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
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/dateFormatter'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  search: {
    type: String,
    default: '',
  },
})

defineEmits([
  'add-task',
  'edit-task',
  'delete-task',
  'toggle-task',
  'update:search',
])

const filteredTasks = computed(() => {
  if (!props.tasks) return []
  const searchTerm = props.search.toLowerCase()
  return props.tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description && task.description.toLowerCase().includes(searchTerm))
    )
  })
})

function getTaskDueDateClasses(task) {
  if (!task.dueDate) return 'text-[var(--text-secondary)]'
  const dueDate = new Date(task.dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (task.completed) {
    return 'text-[var(--text-secondary)]'
  } else if (dueDate < today) {
    return 'text-[var(--danger)]'
  } else if (dueDate.getTime() === today.getTime()) {
    return 'text-[var(--warning)]'
  } else {
    return 'text-[var(--text-secondary)]'
  }
}

function getTaskPriorityColor(priority) {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'badge badge-red'
    case 'medium':
      return 'badge badge-yellow'
    case 'low':
      return 'badge badge-blue'
    default:
      return 'badge'
  }
}
</script>
