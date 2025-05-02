<template>
  <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Results</h3>
      <div class="flex space-x-2">
        <button 
          v-if="aiResponse"
          @click="copyToClipboard(aiResponse)"
          class="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Copy
        </button>
        <button 
          v-if="aiResponse"
          @click="saveToNotes"
          class="text-xs px-2 py-1 rounded bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800"
        >
          Save to Notes
        </button>
      </div>
    </div>
    
    <div 
      v-if="aiResponse" 
      class="prose prose-sm dark:prose-invert max-w-none overflow-y-auto max-h-[400px]"
      v-html="renderedResponse"
    ></div>
    
    <div 
      v-else
      class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p>Enter your text and click "Process with Claude" to get started</p>
    </div>
    
    <!-- Save to Notes Modal -->
    <SaveNoteModal
      v-if="showSaveModal"
      v-model:show="showSaveModal"
      :content="aiResponse"
      :selectedClient="selectedClient" 
      :selectedProject="selectedProject"
      :processingType="processingType"
      @saved="onNoteSaved"
    />
  </div>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import { useRouter } from 'vue-router';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useToast } from '../../composables/useToast';
import SaveNoteModal from './SaveNoteModal.vue';

const props = defineProps({
  aiResponse: {
    type: String,
    default: ''
  },
  selectedClient: {
    type: String,
    default: ''
  },
  selectedProject: {
    type: String,
    default: ''
  },
  processingType: {
    type: String,
    default: 'summarize'
  }
});

const emit = defineEmits(['copy', 'save-note']);

const { aiResponse } = toRefs(props);
const router = useRouter();
const toast = useToast();
const showSaveModal = ref(false);

// Convert markdown to safe HTML
const renderedResponse = computed(() => {
  if (!aiResponse.value) return '';
  const htmlContent = marked(aiResponse.value);
  return DOMPurify.sanitize(htmlContent);
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
    emit('copy');
  } catch (error) {
    console.error('Failed to copy:', error);
    toast.error('Unable to copy to clipboard');
  }
}

function saveToNotes() {
  showSaveModal.value = true;
}

function onNoteSaved() {
  emit('save-note');
  router.push('/notes');
}
</script>

<script>
import { ref } from 'vue';
export default {
  setup() {
    return {
      ref
    }
  }
}
</script> 