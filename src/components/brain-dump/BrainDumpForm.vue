<template>
  <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
    <label for="brainDumpInput" class="label mb-2">Your Input</label>
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

</script>

<style scoped>
textarea {
  min-height: 15rem; /* Ensure textarea has a good default height */
}
</style> 