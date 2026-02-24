<template>
  <div v-if="items.length > 0" class="mt-6 border-t border-[var(--border-light)] pt-4">
    <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-3">
      Actionable Items
      <span class="text-sm font-normal text-[var(--text-secondary)]">
        ({{ selectedItemsCount }} of {{ items.length }} selected)
      </span>
    </h3>
    
    <div class="space-y-3 mb-4">
      <div v-for="(item, index) in items" :key="index" class="flex items-start p-3" :class="item.selected ? 'bg-[var(--surface)]' : ''">
        <div class="flex-shrink-0 mt-1">
          <input 
            type="checkbox" 
            v-model="item.selected" 
            class="h-4 w-4 text-[var(--accent-primary)] rounded"
          />
        </div>
        <div class="ml-3 flex-1">
          <div class="flex flex-wrap items-center mb-1">
            <span class="text-sm font-medium text-[var(--text-primary)] mr-2">
              {{ item.title }}
            </span>
            <span :class="`text-xs px-2 py-0.5 ${getItemTypeClass(item.type)}`">
              {{ item.type }}
            </span>
            <span v-if="item.priority" class="ml-2 text-xs px-2 py-0.5" :class="getPriorityClass(item.priority)">
              {{ item.priority }}
            </span>
            <span v-if="item.dueDate" class="ml-2 text-xs text-[var(--text-secondary)]">
              Due: {{ formatDate(item.dueDate) }}
            </span>
            <span v-if="item.assignee" class="ml-2 text-xs text-[var(--text-secondary)]">
              Assignee: {{ item.assignee }}
            </span>
          </div>
          <p class="text-xs text-[var(--text-secondary)]">
            {{ item.description }}
          </p>
          <div v-if="item.type === 'event' && item.scheduledDate" class="text-xs text-[var(--text-secondary)] mt-1">
            Scheduled: {{ formatDateTime(item.scheduledDate) }} 
            <span v-if="item.duration">({{ item.duration }})</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="flex justify-end">
      <button 
        @click="selectAllItems(true)" 
        class="mr-2 btn btn-secondary text-xs py-1"
        :disabled="allSelected"
      >
        Select All
      </button>
      <button 
        @click="selectAllItems(false)" 
        class="mr-2 btn btn-secondary text-xs py-1"
        :disabled="noneSelected"
      >
        Deselect All
      </button>
      <button 
        @click="createItems" 
        class="btn btn-primary"
        :disabled="selectedItemsCount === 0"
      >
        Create {{ selectedItemsCount }} Selected {{ selectedItemsCount === 1 ? 'Item' : 'Items' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, toRefs } from 'vue';
import { useToast } from 'vue-toastification';
import { formatDate } from '@/utils/dateFormatter';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  isCreating: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['create']);
const toast = useToast();

const { items } = toRefs(props);

// Computed properties for item selection
const selectedItemsCount = computed(() => {
  return items.value.filter(item => item.selected).length;
});

const allSelected = computed(() => {
  return items.value.length > 0 && selectedItemsCount.value === items.value.length;
});

const noneSelected = computed(() => {
  return selectedItemsCount.value === 0;
});

// Format date and time for display
function formatDateTime(dateTimeStr) {
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  } catch (e) {
    return dateTimeStr;
  }
}

// Get CSS class for item type
function getItemTypeClass(type) {
  if (!type) return '';
  
  switch (type.toLowerCase()) {
    case 'task':
      return 'badge badge-blue';
    case 'event':
      return 'badge badge-purple';
    case 'project':
      return 'badge badge-green';
    default:
      return 'badge';
  }
}

// Get CSS class for priority
function getPriorityClass(priority) {
  if (!priority) return '';
  
  switch (priority.toLowerCase()) {
    case 'high':
      return 'badge badge-red';
    case 'medium':
      return 'badge badge-yellow';
    case 'low':
      return 'badge badge-green';
    default:
      return 'badge';
  }
}

// Select or deselect all items
function selectAllItems(selected) {
  items.value.forEach(item => {
    item.selected = selected;
  });
}

// Create the selected items
function createItems() {
  if (selectedItemsCount.value === 0) {
    toast.warning('No items selected');
    return;
  }
  
  emit('create', items.value.filter(item => item.selected));
}
</script> 