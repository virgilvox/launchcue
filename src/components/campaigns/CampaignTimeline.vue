<template>
    <div class="space-y-4 mt-4">
        <h3 class="text-sm font-semibold uppercase text-[var(--text-secondary)] tracking-wider">Timeline Steps</h3>
        <!-- Step List -->
         <div v-if="localSteps.length > 0" class="space-y-4">
            <div 
                v-for="(step, index) in sortedSteps" 
                :key="step.id || index" 
                class="relative pl-8 pb-1 group"
            >
                <!-- Timeline Dot -->
                <div class="absolute left-0 top-1 w-4 h-4 rounded-full bg-[var(--accent-primary)] border-2 border-[var(--surface-elevated)]"></div>
                <!-- Timeline Line -->
                <div v-if="index < localSteps.length - 1" class="absolute left-[7px] top-5 w-0.5 h-full bg-[var(--border-light)]"></div>
                
                <!-- Step Content (Editable) -->
                <div class="flex items-start mb-1 bg-[var(--surface)] p-3">
                    <div class="flex-1">
                         <input 
                            type="text" 
                            v-model="step.title"
                            @change="emitUpdate"
                            placeholder="Step Title"
                            class="text-base font-medium text-[var(--text-primary)] bg-transparent border-none focus:border-[var(--accent-primary)] p-0 mb-1 w-full"
                          />
                         <textarea 
                            v-model="step.description"
                            @change="emitUpdate"
                            placeholder="Step description..."
                            rows="1"
                            class="text-sm text-[var(--text-secondary)] bg-transparent border-none focus:border-[var(--accent-primary)] p-0 w-full resize-none"
                         ></textarea>
                        
                         <div class="flex items-center mt-2 space-x-3">
                            <!-- Date Input -->
                             <input 
                                type="date" 
                                v-model="step.date"
                                @change="emitUpdate"
                                class="input text-xs p-1 w-40"
                             />
                             <!-- Assignee Select -->
                             <select
                                v-model="step.assigneeId"
                                @change="emitUpdate"
                                class="input text-xs p-1 w-40"
                              >
                                 <option :value="null">Unassigned</option>
                                 <option v-for="member in teamMembers" :key="member.id" :value="member.userId">
                                     {{ member.name }}
                                 </option>
                             </select>
                         </div>
                    </div>
                    <!-- Delete Button -->
                    <button @click="removeStep(index)" class="btn-icon text-[var(--text-secondary)] hover:text-[var(--danger)] ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon class="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
         <div v-else class="text-center text-[var(--text-secondary)] text-sm py-4">
             No timeline steps added yet.
         </div>

        <!-- Add Step Button -->
        <button 
            @click="addStep"
            class="btn btn-secondary btn-sm mt-4"
        >
            <PlusIcon class="h-4 w-4 mr-1" />
            Add Timeline Step
        </button>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { TrashIcon, PlusIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
    modelValue: { // Array of step objects
        type: Array,
        required: true
    },
    teamMembers: { // Array of team members for assignee dropdown
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue']);

// Use local copy for editing to avoid direct prop mutation
const localSteps = ref([]);

watch(() => props.modelValue, (newSteps) => {
    // Deep copy and ensure date format is correct for input type="date"
    localSteps.value = JSON.parse(JSON.stringify(newSteps || [])).map(step => ({
        ...step,
        date: step.date ? new Date(step.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));
}, { immediate: true, deep: true });

const sortedSteps = computed(() => {
    return [...localSteps.value].sort((a, b) => new Date(a.date) - new Date(b.date));
});

const addStep = () => {
    localSteps.value.push({
        id: `new-${Date.now()}`, // Temporary ID for new steps
        title: 'New Step',
        description: '',
        date: new Date().toISOString().split('T')[0], // Default to today
        assigneeId: null
    });
    emitUpdate();
};

const removeStep = (index) => {
    // Find the item in the *original* array based on sorted index
    const itemToRemove = sortedSteps.value[index];
    localSteps.value = localSteps.value.filter(step => step.id !== itemToRemove.id);
    emitUpdate();
};

const emitUpdate = () => {
    // Emit the updated array back to the parent
    // Convert date string back to a format backend expects if necessary
    const stepsToEmit = localSteps.value.map(step => ({
        ...step,
        date: step.date || null,
        // Remove temporary ID before emitting if it starts with 'new-'
        id: step.id?.startsWith('new-') ? undefined : step.id
    }));
    emit('update:modelValue', stepsToEmit);
};

</script>

<style scoped>
/* Add styles for timeline visuals if needed */
</style> 