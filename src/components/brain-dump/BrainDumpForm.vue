<template>
  <div class="card p-4 mb-6">
    <label for="brainDumpInput" class="label mb-2">Your Input</label>

    <!-- Template Chips -->
    <div class="flex flex-wrap gap-2 mb-3">
      <button
        v-for="template in templates"
        :key="template.name"
        @click="applyTemplate(template)"
        class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors
               bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-light)]
               hover:bg-[var(--accent-primary-wash)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]"
      >
        {{ template.name }}
      </button>
    </div>

    <textarea
      id="brainDumpInput"
      :value="userInput"
      @input="$emit('update:userInput', $event.target.value)"
      class="input text-sm font-mono h-60"
      placeholder="Paste your notes, meeting summaries, or ideas here..."
    ></textarea>
    <div class="flex justify-end space-x-2 mt-3">
      <button @click="$emit('clear-input')" class="btn-outline btn-sm">Clear</button>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  userInput: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:userInput', 'clear-input']);

const templates = [
  {
    name: 'Daily Standup',
    content: 'What did I accomplish yesterday? What am I working on today? Any blockers?'
  },
  {
    name: 'Retrospective',
    content: 'What went well? What could be improved? Action items for next time?'
  },
  {
    name: 'Sprint Planning',
    content: 'Goals for this sprint: \nTasks to complete: \nDependencies: \nRisks: '
  },
  {
    name: 'Content Ideas',
    content: 'Topic: \nTarget audience: \nKey points: \nFormat (blog/video/talk): '
  },
];

function applyTemplate(template) {
  emit('update:userInput', template.content);
}

</script>

<style scoped>
textarea {
  min-height: 15rem; /* Ensure textarea has a good default height */
}
</style> 