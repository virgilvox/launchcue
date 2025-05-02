<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Brain Dump</h2>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Use AI to help brainstorm and organize your thoughts.
      </p>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- Left Column: Input, Links, Context -->
      <div> 
          <!-- Link To Section -->
          <div class="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Link to (Optional)</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label for="linkClient" class="label text-xs">Client</label>
                      <select 
                        id="linkClient"
                        v-model="selectedClient"
                        class="input text-sm"
                        :disabled="isLoadingClients"
                      >
                        <option :value="null">-- Select Client --</option>
                        <option v-for="client in clients" :key="client.id" :value="client.id">
                          {{ client.name }}
                        </option>
                      </select>
                   </div>
                   <div>
                      <label for="linkProject" class="label text-xs">Project</label>
                      <select 
                        id="linkProject"
                        v-model="selectedProject"
                        class="input text-sm"
                        :disabled="!selectedClient || isLoadingProjects"
                      >
                        <option :value="null">-- Select Project --</option>
                        <option v-for="project in filteredProjectsForLinking" :key="project.id" :value="project.id">
                          {{ project.title }}
                        </option>
                      </select>
                   </div>
              </div>
          </div>

          <!-- Main Input Form -->
          <BrainDumpForm
            v-model:user-input="userInput"
            @clear-input="onClearInput"
          />
        
          <!-- Context Options -->
           <div class="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
               <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Include Context (Optional)</h3>
                <ContextOptions
                    :context-options="contextOptions"
                    :is-loading="isLoadingContext"
                    v-model:context-options="contextOptions"
                />
            </div>
      </div>
      
      <!-- Right Column: Processing, Results -->
      <div>
        <!-- Processing Card (Moved Here) -->
        <div class="card mb-6">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Processing Type</h3>
            <div class="flex flex-wrap gap-2 mb-4">
                <button 
                    v-for="option in processingOptions" 
                    :key="option.value"
                    @click="selectedProcessingType = option.value"
                    :class="[
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        selectedProcessingType === option.value 
                            ? 'bg-primary-600 text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    ]"
                >
                    {{ option.label }}
                </button>
            </div>
             <button 
                @click="processWithAI"
                class="btn btn-primary w-full md:w-auto mt-4"
                :disabled="isProcessing || !userInput.trim()"
            >
                 {{ isProcessing ? 'Processing...' : 'Process with Claude' }}
                 <span v-if="isProcessing" class="animate-spin inline-block h-4 w-4 border-t-2 border-r-2 border-white rounded-full ml-2"></span>
            </button>
        </div>

        <!-- Results Card -->
        <BrainDumpResults
          :ai-response="aiResponse"
          @copy="onCopy"
          @save-note="handleSaveNote"
        />
        
        <!-- Actionable Items Card -->
        <ActionableItems
          v-if="actionableItems.length > 0"
          :items="actionableItems"
          :is-creating="isCreatingItems"
          @create="createSelectedItems"
          class="mt-6" 
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useToast } from '../composables/useToast';
import brainDumpService from '../services/brain-dump.service';
import { useClientStore } from '../stores/client';
import { useProjectStore } from '../stores/project';

// Components
import BrainDumpForm from '../components/brain-dump/BrainDumpForm.vue';
import ContextOptions from '../components/brain-dump/ContextOptions.vue';
import BrainDumpResults from '../components/brain-dump/BrainDumpResults.vue';
import ActionableItems from '../components/brain-dump/ActionableItems.vue';

const toast = useToast();
const clientStore = useClientStore();
const projectStore = useProjectStore();

// State for linking
const selectedClient = ref(null);
const selectedProject = ref(null);
const isLoadingClients = ref(false);
const isLoadingProjects = ref(false);

// State for form/processing
const selectedProcessingType = ref('summarize');
const userInput = ref('');
const isProcessing = ref(false);

// Data for selectors
const clients = computed(() => clientStore.clients);
const projects = computed(() => projectStore.projects);

// Filter projects based on selected client for linking
const filteredProjectsForLinking = computed(() => {
  if (!selectedClient.value) return [];
  return projects.value.filter(p => p.clientId === selectedClient.value);
});

// State for context options - EXPANDED
const contextOptions = reactive({
  clientInfo: true, // Default
  projectInfo: true, // Default
  allNotes: false,
  pastSummaries: true, // Default ON - filter notes by tag
  tasks: true, // Default ON
  campaigns: false,
  calendarEvents: true, // Default ON
  // meetingCount removed - simplify for now
  // resources removed - simplify for now
});
const isLoadingContext = ref(false);
const contextData = ref(null); // Holds fetched context data

// State for results
const aiResponse = ref('');
const actionableItems = ref([]);
const isCreatingItems = ref(false);

// Processing options for AI (same as before)
const processingOptions = [
  { label: 'Summarize', value: 'summarize' },
  { label: 'Extract Key Points', value: 'keyPoints' },
  { label: 'Organize Thoughts', value: 'organize' },
  { label: 'Generate Action Items', value: 'actionItems' },
  { label: 'Find Patterns', value: 'patterns' },
  { label: 'Creative Expansion', value: 'creative' },
  { label: 'Meeting Notes', value: 'meetingNotes' }
];

// Lifecycle hooks
onMounted(async () => {
  isLoadingClients.value = true;
  isLoadingProjects.value = true;
  try {
    await Promise.all([
      clientStore.fetchClients(),
      projectStore.fetchProjects()
    ]);
  } catch(err) {
    console.error("Error loading initial client/project data", err);
    toast.error("Failed to load client/project list");
  } finally {
    isLoadingClients.value = false;
    isLoadingProjects.value = false;
  }
});

// Watch selected client to clear selected project
watch(selectedClient, (newClientId) => {
  selectedProject.value = null;
});

// Process input with AI (Main Logic)
async function processWithAI() {
  isProcessing.value = true;
  aiResponse.value = '';
  actionableItems.value = [];
  contextData.value = null; // Clear previous context
  let formattedContext = '';

  try {
    // 1. Fetch context data ONLY if needed options are selected
    const requiresContextFetch = Object.entries(contextOptions).some(([key, value]) => value === true);
    
    if (requiresContextFetch && (selectedClient.value || selectedProject.value)) {
      console.log("Fetching context data...");
      await fetchContextData(); // Fetches based on reactive contextOptions
      if (contextData.value) {
        formattedContext = formatContextDataForPrompt(); // Format it for the prompt
        console.log("Formatted Context:", formattedContext.substring(0, 200) + "...");
      } else {
        console.log("No context data returned from fetch.");
      }
    } else {
      console.log("Skipping context fetch.");
    }
    
    // 2. Call the AI processing service
    const result = await brainDumpService.processText({
      input: userInput.value,
      processingType: selectedProcessingType.value,
      contextInfo: formattedContext, // Pass the potentially large context string
      useEnrichedContext: !!formattedContext // Indicate if context was added
    });
    
    // 3. Handle results
    if (result) {
      aiResponse.value = result.response || '';
      if (result.structuredData?.length) {
        actionableItems.value = result.structuredData.map(item => ({ ...item, selected: true }));
      }
      toast.success('Processing complete!');
    } else {
      throw new Error("Received empty response from AI service");
    }

  } catch (error) {
    console.error('Error processing with AI:', error);
    toast.error(`Processing failed: ${error.message || 'Unknown error'}`);
    aiResponse.value = `Error during processing: ${error.message || 'Unknown error'}`;
  } finally {
    isProcessing.value = false;
  }
}

// Fetch context data from various sources
async function fetchContextData() {
  isLoadingContext.value = true;
  try {
    // Pass selected options to the service
    const params = {
      clientId: selectedClient.value || undefined,
      projectId: selectedProject.value || undefined,
      options: JSON.stringify(contextOptions) // Send selected options
    };
    contextData.value = await brainDumpService.getContextData(params);
  } catch (error) {
    console.error('Error fetching context data:', error);
    toast.error('Failed to load context data');
    contextData.value = null;
  } finally {
    isLoadingContext.value = false;
  }
}

// Format the FETCHED context data for the AI prompt
function formatContextDataForPrompt() {
  if (!contextData.value) return '';
  let contextString = '';
  const data = contextData.value;

  // Format each section only if it exists in the fetched data
  if (data.clientInfo) contextString += formatSection("Client Information", data.clientInfo);
  if (data.projectInfo) contextString += formatSection("Project Information", data.projectInfo);
  if (data.allNotes?.length) contextString += formatArraySection("All Notes", data.allNotes, item => `${item.title} (Created: ${formatDateSimple(item.createdAt)})`);
  if (data.pastSummaries?.length) contextString += formatArraySection("Past Summaries/Brain Dumps", data.pastSummaries, item => `${item.title} (Created: ${formatDateSimple(item.createdAt)})`);
  if (data.tasks?.length) contextString += formatArraySection("Associated Tasks", data.tasks, item => `${item.title} (Status: ${item.status}, Due: ${formatDateSimple(item.dueDate) || 'N/A'})`);
  if (data.campaigns?.length) contextString += formatArraySection("Associated Campaigns", data.campaigns, item => `${item.title} (Status: ${item.status || 'N/A'}, End: ${formatDateSimple(item.endDate) || 'N/A'})`);
  if (data.calendarEvents?.length) contextString += formatArraySection("Upcoming Calendar Events", data.calendarEvents, item => `${item.title} (Date: ${formatDateSimple(item.start || item.date)})`);

  return contextString;
}

// Helper to format object sections
function formatSection(title, obj) {
  let str = `## ${title}\n`;
  for (const [key, value] of Object.entries(obj)) {
    if (value) str += `- ${key.replace(/([A-Z])/g, ' $1').trim()}: ${value}\n`;
  }
  return str + '\n';
}

// Helper to format array sections
function formatArraySection(title, arr, formatter) {
  let str = `## ${title}\n`;
  arr.forEach(item => str += `- ${formatter(item)}\n`);
  return str + '\n';
}

// Simple date formatter for context
function formatDateSimple(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD
  } catch { return null; }
}

// Create selected actionable items
async function createSelectedItems(selectedItems) {
  if (!selectedItems.length) {
    toast.warning('No items selected');
    return;
  }
  
  isCreatingItems.value = true;
  
  try {
    // Categorize items by type
    const tasks = selectedItems.filter(item => item.type.toLowerCase() === 'task');
    const events = selectedItems.filter(item => item.type.toLowerCase() === 'event');
    const projects = selectedItems.filter(item => item.type.toLowerCase() === 'project');
    
    // Call service to create items
    const result = await brainDumpService.createItems({
      tasks,
      events,
      projects
    });
    
    // Build success message
    const taskCount = result.results.taskCount;
    const eventCount = result.results.eventCount;
    const projectCount = result.results.projectCount;
    
    let message = 'Created: ';
    if (taskCount > 0) message += `${taskCount} task${taskCount > 1 ? 's' : ''} `;
    if (eventCount > 0) message += `${eventCount} event${eventCount > 1 ? 's' : ''} `;
    if (projectCount > 0) message += `${projectCount} project${projectCount > 1 ? 's' : ''} `;
    
    toast.success(message);
    
    // Remove created items
    actionableItems.value = actionableItems.value.filter(
      item => !selectedItems.includes(item)
    );
  } catch (error) {
    console.error('Error creating items:', error);
    toast.error('Failed to create items');
  } finally {
    isCreatingItems.value = false;
  }
}

// Event handlers
function onClearInput() {
  actionableItems.value = [];
  aiResponse.value = '';
}

function onCopy() {
  toast.info('Copied to clipboard');
}

function handleSaveNote() { 
  // This is now handled by the SaveNoteModal via brainDumpService.createNote 
  // which uses noteService. We don't need direct action here anymore.
  // The modal emits 'saved', which could trigger UI updates if needed.
  console.log("Save note initiated via modal.");
}

</script>

<style scoped>
/* Add specific styles */
</style> 