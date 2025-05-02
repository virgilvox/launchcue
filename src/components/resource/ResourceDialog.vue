<script setup>
import { ref, watch } from 'vue';
import AppButton from '@/components/ui/AppButton.vue';

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  resource: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:show', 'save']);

const form = ref({
  id: '',
  name: '',
  type: '',
  url: 'https://',
  description: '',
  tags: []
});

const tagsInput = ref('');
const isSubmitting = ref(false);

// Resource types for dropdown
const resourceTypes = [
  'Documentation',
  'Tutorial',
  'Article',
  'Video',
  'Tool',
  'API',
  'Repository',
  'Template',
  'Reference',
  'Book',
  'Podcast',
  'Course',
  'Other'
];

// Initialize form when resource changes
watch(() => props.resource, (newResource) => {
  if (newResource) {
    // Editing existing resource
    form.value = {
      id: newResource.id,
      name: newResource.name || '',
      type: newResource.type || '',
      url: newResource.url || 'https://',
      description: newResource.description || '',
      tags: newResource.tags || []
    };
    tagsInput.value = form.value.tags.join(', ');
  } else {
    // Creating new resource
    form.value = {
      id: '',
      name: '',
      type: '',
      url: 'https://',
      description: '',
      tags: []
    };
    tagsInput.value = '';
  }
}, { immediate: true });

// Update tags when tagsInput changes
watch(tagsInput, (newValue) => {
  if (newValue.trim()) {
    form.value.tags = newValue.split(',').map(tag => tag.trim()).filter(Boolean);
  } else {
    form.value.tags = [];
  }
});

// Close dialog
function closeDialog() {
  emit('update:show', false);
}

// Submit form
async function submitForm() {
  isSubmitting.value = true;
  
  try {
    emit('save', { ...form.value });
  } catch (error) {
    console.error('Error submitting resource form:', error);
    // Error is handled by parent component
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Backdrop -->
    <div 
      class="fixed inset-0 bg-black bg-opacity-50"
      @click="closeDialog"
    ></div>
    
    <!-- Dialog -->
    <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg z-10 relative">
      <h2 class="text-xl font-semibold mb-6">
        {{ resource ? 'Edit Resource' : 'Add Resource' }}
      </h2>
      
      <form @submit.prevent="submitForm">
        <!-- Name -->
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-black mb-1">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            class="w-full px-3 py-2 border rounded-md"
            placeholder="Resource name"
            required
          />
        </div>
        
        <!-- Type -->
        <div class="mb-4">
          <label for="type" class="block text-sm font-medium text-black mb-1">Type</label>
          <select
            id="type"
            v-model="form.type"
            class="w-full px-3 py-2 border rounded-md text-black"
            required
          >
            <option value="" disabled class="text-black">Select a type</option>
            <option v-for="type in resourceTypes" :key="type" :value="type" class="text-black">
              {{ type }}
            </option>
          </select>
        </div>
        
        <!-- URL -->
        <div class="mb-4">
          <label for="url" class="block text-sm font-medium text-black mb-1">URL</label>
          <input
            id="url"
            v-model="form.url"
            type="url"
            class="w-full px-3 py-2 border rounded-md"
            placeholder="https://example.com"
            required
          />
        </div>
        
        <!-- Description -->
        <div class="mb-4">
          <label for="description" class="block text-sm font-medium text-black mb-1">Description</label>
          <textarea
            id="description"
            v-model="form.description"
            class="w-full px-3 py-2 border rounded-md"
            rows="3"
            placeholder="Brief description of the resource"
          ></textarea>
        </div>
        
        <!-- Tags -->
        <div class="mb-6">
          <label for="tags" class="block text-sm font-medium text-black mb-1">Tags</label>
          <input
            id="tags"
            v-model="tagsInput"
            type="text"
            class="w-full px-3 py-2 border rounded-md"
            placeholder="Enter tags separated by commas"
          />
          <div v-if="form.tags.length > 0" class="mt-2 flex flex-wrap gap-2">
            <span 
              v-for="tag in form.tags" 
              :key="tag"
              class="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>
        
        <!-- Buttons -->
        <div class="flex justify-end space-x-3">
          <AppButton
            type="button"
            variant="secondary"
            @click="closeDialog"
          >
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ resource ? 'Update Resource' : 'Add Resource' }}
          </AppButton>
        </div>
      </form>
    </div>
  </div>
</template> 