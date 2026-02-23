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

// Resource types grouped by category
const resourceTypeGroups = [
  {
    label: 'Docs',
    types: ['Documentation', 'Tutorial', 'Article', 'Reference', 'Book', 'Course']
  },
  {
    label: 'Tools',
    types: ['Tool', 'API']
  },
  {
    label: 'Repos',
    types: ['Repository', 'Template']
  },
  {
    label: 'Media',
    types: ['Video', 'Podcast']
  },
  {
    label: 'Other',
    types: ['Designs', 'Other']
  }
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

// Remove a tag by clicking its X
function removeTag(tagToRemove) {
  form.value.tags = form.value.tags.filter(t => t !== tagToRemove);
  tagsInput.value = form.value.tags.join(', ');
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
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg z-10 relative max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {{ resource ? 'Edit Resource' : 'Add Resource' }}
        </h2>
        <button
          @click="closeDialog"
          class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="submitForm" class="space-y-4">
        <!-- Name & Type in a row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Name -->
          <div>
            <label for="res-name" class="label">Name *</label>
            <input
              id="res-name"
              v-model="form.name"
              type="text"
              class="input"
              placeholder="Resource name"
              required
            />
          </div>

          <!-- Type / Category -->
          <div>
            <label for="res-type" class="label">Type *</label>
            <select
              id="res-type"
              v-model="form.type"
              class="input"
              required
            >
              <option value="" disabled>Select a type</option>
              <optgroup v-for="group in resourceTypeGroups" :key="group.label" :label="group.label">
                <option v-for="type in group.types" :key="type" :value="type">
                  {{ type }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>

        <!-- URL -->
        <div>
          <label for="res-url" class="label">URL *</label>
          <input
            id="res-url"
            v-model="form.url"
            type="url"
            class="input"
            placeholder="https://example.com"
            required
          />
        </div>

        <!-- Description -->
        <div>
          <label for="res-description" class="label">Description</label>
          <textarea
            id="res-description"
            v-model="form.description"
            class="input"
            rows="3"
            placeholder="Brief description of the resource"
          ></textarea>
        </div>

        <!-- Tags -->
        <div>
          <label for="res-tags" class="label">Tags (comma separated)</label>
          <input
            id="res-tags"
            v-model="tagsInput"
            type="text"
            class="input"
            placeholder="e.g., frontend, react, docs"
          />
          <div v-if="form.tags.length > 0" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </span>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
