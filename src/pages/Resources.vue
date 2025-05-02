<template>
  <div class="container px-4 py-8 mx-auto">
    <PageHeader title="Resources">
      <template #actions>
        <AppButton @click="openResourceDialog()">
          Add Resource
        </AppButton>
      </template>
    </PageHeader>
    
    <!-- Search/Filter Input -->
    <div class="mb-6">
      <input
        v-model="filterText"
        type="text"
        placeholder="Search resources..."
        class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
      />
    </div>
    
    <!-- Loading State -->
    <div v-if="resourceStore.isLoading" class="flex justify-center py-12">
      <div class="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="resourceStore.error" class="p-6 text-center bg-red-100 rounded-md">
      <p class="text-red-700">{{ resourceStore.error }}</p>
      <AppButton @click="resourceStore.fetchResources()" class="mt-4">
        Try Again
      </AppButton>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!resourceStore.resources.length" class="p-12 text-center bg-gray-100 rounded-md">
      <h3 class="mb-4 text-xl font-medium">No resources yet</h3>
      <p class="mb-6 text-black dark:text-white">Add resources like links, documents, or references for your team.</p>
      <AppButton @click="openResourceDialog()">
        Add Your First Resource
      </AppButton>
    </div>
    
    <!-- Resource List -->
    <div v-else>
      <div v-for="(resources, type) in resourcesByType" :key="type" class="mb-8">
        <h2 class="mb-4 text-xl font-semibold">{{ type }}</h2>
        
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="resource in resources"
            :key="resource.id"
            class="p-4 bg-white border rounded-md shadow-sm hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between">
              <h3 class="text-lg font-medium text-black dark:text-white">{{ resource.name }}</h3>
              
              <div class="flex space-x-2">
                <button 
                  @click="openResourceDialog(resource)" 
                  class="p-1 text-black hover:text-blue-500"
                >
                  <span class="sr-only">Edit</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <button 
                  @click="deleteResource(resource)" 
                  class="p-1 text-black hover:text-red-500"
                >
                  <span class="sr-only">Delete</span>
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <p v-if="resource.description" class="mt-2 text-sm text-black dark:text-gray-300">
              {{ resource.description }}
            </p>
            
            <div class="flex items-center mt-3">
              <a
                :href="resource.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-blue-600 hover:underline truncate"
              >
                {{ resource.url }}
              </a>
            </div>
            
            <div v-if="resource.tags && resource.tags.length" class="flex flex-wrap gap-2 mt-3">
              <span
                v-for="tag in resource.tags"
                :key="tag"
                class="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-full"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Resource Dialog -->
    <ResourceDialog
      v-if="showDialog"
      v-model:show="showDialog"
      :resource="editResource"
      @save="saveResource"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useResourceStore } from '@/stores/resource';
import { useToast } from 'vue-toastification';
import AppButton from '../components/ui/AppButton.vue';
import PageHeader from '../components/ui/PageHeader.vue';

// Import ResourceDialog using defineAsyncComponent for better error handling
const ResourceDialog = defineAsyncComponent({
  loader: () => import('@/components/resource/ResourceDialog.vue'),
  errorComponent: {
    template: '<div class="p-4 bg-red-100 text-red-700 rounded-lg">Failed to load resource dialog component</div>'
  },
  onError(error, retry, fail) {
    console.error('Error loading ResourceDialog component:', error);
    fail();
  }
});

const router = useRouter();
const toast = useToast();
const resourceStore = useResourceStore();
const showDialog = ref(false);
const editResource = ref(null);
const filterText = ref('');

// Load resources on component mount
onMounted(async () => {
  try {
    await resourceStore.fetchResources();
  } catch (error) {
    console.error('Failed to load resources:', error);
  }
});

// Filter resources based on search text
const filteredResources = computed(() => {
  const searchTerm = filterText.value.toLowerCase();
  return resourceStore.resources.filter(resource => 
    resource.name.toLowerCase().includes(searchTerm) || 
    resource.description?.toLowerCase().includes(searchTerm) ||
    resource.type?.toLowerCase().includes(searchTerm) ||
    resource.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
  );
});

// Group resources by type
const resourcesByType = computed(() => {
  const grouped = {};
  
  filteredResources.value.forEach(resource => {
    const type = resource.type || 'Other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(resource);
  });
  
  return grouped;
});

// Handle opening the dialog for creating or editing
function openResourceDialog(resource = null) {
  editResource.value = resource;
  showDialog.value = true;
}

// Handle saving a resource (create or update)
async function saveResource(resourceData) {
  try {
    if (resourceData.id) {
      // Update existing resource
      await resourceStore.updateResource(resourceData.id, resourceData);
      toast.success('Resource updated successfully');
    } else {
      // Create new resource
      await resourceStore.createResource(resourceData);
      toast.success('Resource created successfully');
    }
    
    showDialog.value = false;
    editResource.value = null;
  } catch (error) {
    console.error('Error saving resource:', error);
    toast.error(`Failed to save resource: ${error.message}`);
  }
}

// Handle deleting a resource
async function deleteResource(resource) {
  if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) {
    return;
  }
  
  try {
    await resourceStore.deleteResource(resource.id);
    toast.success('Resource deleted successfully');
  } catch (error) {
    console.error('Error deleting resource:', error);
    toast.error(`Failed to delete resource: ${error.message}`);
  }
}
</script> 