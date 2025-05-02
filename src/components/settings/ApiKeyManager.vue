<template>
 <section id="api-keys" class="card">
    <h3 class="text-lg font-semibold mb-4">API Keys</h3>
    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Manage API keys. <span class="font-semibold">Remember to copy your key immediately upon generation, as it will not be shown again.</span>
    </p>

    <!-- Existing Keys -->
    <div v-if="loadingKeys" class="text-center py-4">
        <LoadingSpinner size="small" text="Loading keys..." />
    </div>
     <div v-else-if="apiKeys.length === 0" class="text-center py-6 border dark:border-gray-700 rounded-md">
        <p class="text-gray-500 dark:text-gray-400">No API keys created yet.</p>
    </div>
    <ul v-else class="space-y-4 mb-6 border dark:border-gray-700 rounded-md p-4">
      <li v-for="key in apiKeys" :key="key.prefix" class="flex items-start justify-between group">
        <div class="flex-1 mr-4">
          <p class="font-medium text-gray-800 dark:text-gray-200">{{ key.name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ key.prefix }}...</p>
          <div class="mt-1">
              <p class="text-xs text-gray-500 dark:text-gray-400">Scopes: 
                  <span v-if="key.scopes && key.scopes.length > 0" class="font-medium">{{ key.scopes.join(', ') }}</span>
                  <span v-else>None</span>
              </p>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Created: {{ formatDate(key.createdAt) }}</p>
          <p v-if="key.lastUsedAt" class="text-xs text-gray-500 dark:text-gray-400">Last Used: {{ formatDate(key.lastUsedAt) }}</p>
        </div>
         <!-- Delete button for existing keys -->
        <button 
            @click="confirmDeleteKey(key)" 
            class="btn-icon text-gray-400 hover:text-red-600 dark:hover:text-red-500 flex-shrink-0"
            title="Delete Key"
         >
            <TrashIcon class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <!-- Generate New Key -->
    <div class="border-t dark:border-gray-700 pt-6 mt-6">
        <h4 class="text-md font-semibold mb-3 text-gray-800 dark:text-gray-100">Generate New API Key</h4>
        <div class="flex items-end gap-4 mb-4">
            <div class="flex-grow">
                <label for="keyName" class="label text-xs">Key Name *</label>
                <input 
                    id="keyName"
                    v-model="newKeyName"
                    type="text" 
                    class="input text-sm" 
                    placeholder="e.g., Script integration"
                    :disabled="isGenerating"
                    required
                />
            </div>
            <button 
                @click="generateKey"
                class="btn btn-secondary flex-shrink-0"
                :disabled="isGenerating || !newKeyName.trim()"
            >
                {{ isGenerating ? 'Generating...' : 'Generate Key' }}
            </button>
        </div>

        <!-- Scope Selection -->
        <div>
            <label class="label text-xs mb-2">Key Permissions (Scopes)</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                <div v-for="scope in availableScopes" :key="scope" class="flex items-center">
                    <input 
                        :id="`scope-${scope}`"
                        type="checkbox"
                        :value="scope"
                        v-model="selectedScopes"
                        class="form-checkbox"
                    />
                    <label 
                        :for="`scope-${scope}`" 
                        class="ml-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
                     >
                         {{ formatScopeName(scope) }}
                     </label>
                </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Select the permissions this key should have. Defaults to read-only access.</p>
        </div>
    </div>

    <!-- Display Newly Generated Key -->
    <div v-if="newlyGeneratedKey" class="mt-6 p-4 border rounded-md bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
        <p class="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">New API Key Generated (Copy & Save Now!):</p>
        <div class="flex items-center bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-600">
            <input 
                type="text"
                :value="newlyGeneratedKey" 
                readonly
                class="input text-sm font-mono flex-grow break-all bg-transparent border-none p-0 focus:ring-0" 
                ref="apiKeyInputRef" 
            />
            <!-- Copy button ONLY for the newly generated key -->
            <button @click="copyGeneratedKey" class="btn-icon text-gray-500 hover:text-primary-600 ml-2 flex-shrink-0" title="Copy Key">
                <ClipboardDocumentIcon class="h-5 w-5" />
            </button>
        </div>
         <p class="text-xs text-green-700 dark:text-green-300 mt-2">This key will not be shown again. Store it securely.</p>
    </div>

    <!-- Delete Confirmation Modal -->
     <Modal v-model="showDeleteModal" title="Confirm Delete API Key">
      <div v-if="keyToDelete" class="space-y-4">
        <p class="text-gray-700 dark:text-gray-300">Are you sure you want to delete the API key named "<span class="font-medium">{{ keyToDelete.name }}</span>"?</p>
         <p class="text-xs text-gray-500 dark:text-gray-400">Prefix: {{ keyToDelete.prefix }}...</p>
        <p class="text-sm text-red-600">This action cannot be undone.</p>
        <div class="form-actions">
          <button type="button" @click="showDeleteModal = false" class="btn-outline">Cancel</button>
          <button 
            type="button" 
            @click="deleteKey" 
            class="btn-danger" 
            :disabled="isDeleting"
           >
            {{ isDeleting ? 'Deleting...' : 'Delete Key' }}
          </button>
        </div>
      </div>
    </Modal>

 </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import apiKeyService from '../../services/apiKey.service'; // Use the new service
import { useToast } from 'vue-toastification';
import Modal from '../Modal.vue';
import LoadingSpinner from '../LoadingSpinner.vue';
import { TrashIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline';

const toast = useToast();
const apiKeys = ref([]);
const loadingKeys = ref(false);
const isGenerating = ref(false);
const isDeleting = ref(false);
const newKeyName = ref('');
const newlyGeneratedKey = ref(null); // Store the newly generated key temporarily
const showDeleteModal = ref(false);
const keyToDelete = ref(null);
const apiKeyInputRef = ref(null);

const availableScopes = [
    'read:projects', 'write:projects',
    'read:tasks', 'write:tasks',
    'read:clients', 'write:clients',
    'read:campaigns', 'write:campaigns',
    'read:notes', 'write:notes',
    'read:teams', 'write:teams',
    'read:resources', 'write:resources',
    'read:calendar-events', 'write:calendar-events',
    'read:braindumps', 'write:braindumps',
    'read:api-keys', 'write:api-keys'
];

const selectedScopes = ref(['read:projects', 'read:tasks', 'read:clients']); // Default scopes

async function loadApiKeys() {
    loadingKeys.value = true;
    // Do not clear newlyGeneratedKey here, allow user to copy it after list refresh
    // newlyGeneratedKey.value = null; 
    try {
        apiKeys.value = await apiKeyService.getKeys();
    } catch (error) {
        console.error("Error loading API keys:", error);
        toast.error("Failed to load API keys.");
    } finally {
        loadingKeys.value = false;
    }
}

async function generateKey() {
    if (!newKeyName.value.trim()) {
        toast.warning("Please enter a name for the API key.");
        return;
    }
    if (selectedScopes.value.length === 0) {
        toast.warning("Please select at least one scope for the API key.");
        return;
    }
    isGenerating.value = true;
    newlyGeneratedKey.value = null; // Clear previous before generating
    try {
        const result = await apiKeyService.createKey({
             name: newKeyName.value.trim(),
             scopes: selectedScopes.value // Pass selected scopes
        });
        if (result && result.apiKey) {
            newlyGeneratedKey.value = result.apiKey; // Display the full key
            toast.success(`API Key "${result.name}" generated successfully!`);
            newKeyName.value = ''; // Clear input
            selectedScopes.value = ['read:projects', 'read:tasks', 'read:clients']; // Reset scopes
            await loadApiKeys(); // Refresh the list
        } else {
             throw new Error("Invalid response from server during key generation.");
        }
    } catch (error) {
        console.error("Error generating API key:", error);
        toast.error(`Failed to generate API key: ${error.message || 'Unknown error'}`);
    } finally {
        isGenerating.value = false;
    }
}

function confirmDeleteKey(key) {
    keyToDelete.value = key;
    showDeleteModal.value = true;
}

async function deleteKey() {
    if (!keyToDelete.value) return;
    isDeleting.value = true;
    try {
        await apiKeyService.deleteKey(keyToDelete.value.prefix);
        toast.success(`API Key "${keyToDelete.value.name}" deleted.`);
        showDeleteModal.value = false;
        keyToDelete.value = null;
        await loadApiKeys(); // Refresh the list
    } catch (error) {
        console.error("Error deleting API key:", error);
        toast.error(`Failed to delete API key: ${error.message || 'Unknown error'}`);
    } finally {
        isDeleting.value = false;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

// Renamed copy function for clarity
async function copyGeneratedKey() {
  if (!newlyGeneratedKey.value) return;
  try {
    await navigator.clipboard.writeText(newlyGeneratedKey.value);
    toast.success('API Key Copied!');
  } catch (error) {
    console.error('Failed to copy API key:', error);
    toast.error('Could not copy key to clipboard.');
  }
}

// Helper to make scope names more readable
function formatScopeName(scope) {
    const parts = scope.split(':');
    const action = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const resource = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    return `${action} ${resource}`;
}

onMounted(() => {
    loadApiKeys();
});

</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 