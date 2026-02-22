<template>
  <Modal :modelValue="show" @update:modelValue="$emit('update:show', $event)" title="Save as Note">
    <form @submit.prevent="confirmSaveToNotes">
      <div class="form-group">
        <label for="noteTitle" class="label">Note Title</label>
        <input 
          id="noteTitle"
          v-model="noteForm.title"
          type="text" 
          class="input" 
          required 
        />
      </div>
      <div class="form-group">
        <label for="noteTags" class="label">Tags (comma separated)</label>
        <input 
          id="noteTags"
          v-model="noteForm.tags"
          type="text" 
          class="input" 
          placeholder="e.g., meeting, summary, braindump-summary"
        />
      </div>
      <div class="form-group">
         <label class="label">Content Preview</label>
         <div class="p-2 border rounded dark:border-gray-600 max-h-40 overflow-y-auto text-sm bg-gray-50 dark:bg-gray-700">
             {{ content }} 
         </div>
      </div>
      <div class="form-actions">
        <button type="button" @click="$emit('update:show', false)" class="btn-outline">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Note' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Modal from '../Modal.vue';
import noteService from '@/services/note.service'; // Corrected path
import { useToast } from 'vue-toastification';

const props = defineProps({
  show: Boolean,
  content: String,
  selectedClient: String,
  selectedProject: String,
  processingType: String
});

const emit = defineEmits(['update:show', 'saved']);

const toast = useToast();
const isSaving = ref(false);
const noteForm = ref({
  title: '',
  tags: ''
});

function generateTitle() {
    const headingMatch = props.content?.match(/^#+\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
        return headingMatch[1].substring(0, 100); // Limit title length
    }
    // Get first few words if no heading
    const firstWords = props.content?.split(/\s+/).slice(0, 8).join(' ');
    return firstWords ? `${firstWords}...` : 'AI Generated Note';
}

function generateTags() {
    const tags = ['braindump-summary', 'ai-generated'];
    if (props.processingType) {
        tags.push(props.processingType.toLowerCase());
    }
    return tags.join(', ');
}

// Initialize form when modal opens
onMounted(() => {
    if (props.show) { // Initialize only when shown (might need watch if props change while open)
        noteForm.value.title = generateTitle();
        noteForm.value.tags = generateTags();
    }
});

// Watch prop might be better if modal can reopen with different content
// watch(() => props.show, (newVal) => { ... });

async function confirmSaveToNotes() {
  isSaving.value = true;
  try {
    const tagsArray = noteForm.value.tags.split(',').map(t => t.trim()).filter(t => t !== '');
    
    const noteData = {
        title: noteForm.value.title,
        content: props.content, // Save the full AI response content
        tags: tagsArray,
        clientId: props.selectedClient || null,
        projectId: props.selectedProject || null,
        // teamId and userId added by backend automatically
    };
    
    await noteService.createNote(noteData);
    toast.success('Note saved successfully!');
    emit('saved'); // Notify parent
    emit('update:show', false); // Close modal

  } catch (error) {
      console.error("Error saving note from Brain Dump:", error);
      toast.error(`Failed to save note: ${error.message || 'Unknown error'}`);
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style> 