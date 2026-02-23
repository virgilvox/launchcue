<template>
    <div class="space-y-4 mt-4">
        <h3 class="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Timeline Steps</h3>
        <!-- Step List -->
         <div v-if="localSteps.length > 0" class="space-y-4">
            <div 
                v-for="(step, index) in sortedSteps" 
                :key="step.id || index" 
                class="relative pl-8 pb-1 group"
            >
                <!-- Timeline Dot -->
                <div class="absolute left-0 top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-800"></div>
                <!-- Timeline Line -->
                <div v-if="index < localSteps.length - 1" class="absolute left-[7px] top-5 w-0.5 h-full bg-gray-300 dark:bg-gray-600"></div>
                
                <!-- Step Content (Editable) -->
                <div class="flex items-start mb-1 bg-gray-50 dark:bg-gray-750 p-3 rounded-md shadow-sm">
                    <div class="flex-1">
                         <input 
                            type="text" 
                            v-model="step.title"
                            @change="emitUpdate"
                            placeholder="Step Title"
                            class="text-base font-medium text-gray-900 dark:text-white bg-transparent border-none focus:ring-1 focus:ring-primary-500 p-0 mb-1 w-full"
                          />
                         <textarea 
                            v-model="step.description"
                            @change="emitUpdate"
                            placeholder="Step description..."
                            rows="1"
                            class="text-sm text-gray-600 dark:text-gray-300 bg-transparent border-none focus:ring-1 focus:ring-primary-500 p-0 w-full resize-none"
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
                    <button @click="removeStep(index)" class="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-500 ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon class="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
         <div v-else class="text-center text-gray-500 text-sm py-4">
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