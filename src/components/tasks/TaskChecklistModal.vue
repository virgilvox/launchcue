<template>
  <Modal :modelValue="modelValue" @update:modelValue="emit('update:modelValue')" title="Task Checklist">
    <div v-if="task && task.id" class="space-y-4">
      <h3 class="text-lg font-medium text-[var(--text-primary)]">{{ task.title }}</h3>
      
      <div v-if="localChecklist && localChecklist.length > 0" class="space-y-2 max-h-60 overflow-y-auto pr-2">
        <div 
          v-for="(item, index) in localChecklist" 
          :key="item.id || index" 
          class="flex items-center p-2 border-b border-[var(--border-light)]"
        >
          <input 
            :id="`checklist-${item.id || index}`" 
            v-model="item.completed" 
            type="checkbox" 
            class="form-checkbox h-4 w-4 mr-3"
            @change="emitUpdate()" 
          />
          <input 
            type="text"
            v-model="item.title"
            class="flex-grow bg-transparent border-none p-0 text-sm text-[var(--text-primary)]" 
            placeholder="Item description"
            @change="emitUpdate()"
            @keyup.enter="$event.target.blur()" 
          />
          <button 
            @click="removeItem(index)" 
            class="btn-icon text-[var(--text-secondary)] hover:text-[var(--danger)] ml-2"
            title="Remove Item"
          >
            <XMarkIcon class="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div v-else class="text-center my-4 text-[var(--text-secondary)]">
        No items in checklist
      </div>
      
      <div class="flex items-center mt-4">
        <input 
          v-model="newItemTitle" 
          type="text" 
          class="form-input flex-grow mr-2 text-sm" 
          placeholder="Add new item..." 
          @keyup.enter="addItem"
        />
        <button 
          @click="addItem" 
          class="btn btn-primary text-sm py-1.5"
          :disabled="!newItemTitle.trim()"
        >
          Add
        </button>
      </div>
      
      <div class="form-actions mt-6">
         <span class="text-sm text-[var(--text-secondary)] mr-auto">
             {{ completedCount }} / {{ totalCount }} completed
         </span>
        <button type="button" @click="emit('update:modelValue', false)" class="btn btn-primary">
          Done
        </button>
      </div>
    </div>
    <div v-else class="text-center text-[var(--text-secondary)]">Loading checklist...</div>
  </Modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import Modal from '../Modal.vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  modelValue: Boolean, // Controls modal visibility
  task: {           // The task object containing the checklist
      type: Object,
      required: true
  } 
});

const emit = defineEmits(['update:modelValue', 'updateChecklist']);

const localChecklist = ref([]);
const newItemTitle = ref('');

// Initialize local checklist when task prop changes
watch(() => props.task, (newTask) => {
    // Deep copy to avoid mutating prop, assign unique IDs if missing for key binding
    localChecklist.value = (newTask?.checklist || []).map((item, index) => ({ 
        ...item, 
        id: item.id || `temp-${index}-${Date.now()}` // Temporary ID for items without one
    }));
}, { immediate: true, deep: true });

const completedCount = computed(() => localChecklist.value.filter(item => item.completed).length);
const totalCount = computed(() => localChecklist.value.length);

const addItem = () => {
  if (!newItemTitle.value.trim()) return;
  localChecklist.value.push({
    id: `temp-new-${Date.now()}`,
    title: newItemTitle.value.trim(),
    completed: false
  });
  newItemTitle.value = '';
  emitUpdate();
};

const removeItem = (index) => {
  localChecklist.value.splice(index, 1);
  emitUpdate();
};

// Debounce emitting updates? Maybe not necessary if updates are quick
const emitUpdate = () => {
    // Emit only the core checklist data, removing temporary IDs if needed
    const checklistToEmit = localChecklist.value.map(item => ({
        title: item.title,
        completed: item.completed,
        // Include original ID if it exists, otherwise it's a new item
        ...(item.id && !item.id.startsWith('temp-') && { id: item.id })
    }));
    emit('updateChecklist', checklistToEmit);
}

</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 