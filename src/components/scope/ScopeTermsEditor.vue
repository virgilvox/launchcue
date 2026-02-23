<template>
  <div class="scope-terms-editor">
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="flex flex-wrap items-center gap-0.5 p-2 border border-b-0 border-gray-300 dark:border-gray-600 rounded-t-md bg-gray-50 dark:bg-gray-700"
    >
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="['btn btn-sm', editor.isActive('bold') ? 'btn-primary' : 'btn-ghost']"
        title="Bold"
      >
        <span class="font-bold">B</span>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="['btn btn-sm', editor.isActive('italic') ? 'btn-primary' : 'btn-ghost']"
        title="Italic"
      >
        <span class="italic">I</span>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="['btn btn-sm', editor.isActive('heading', { level: 3 }) ? 'btn-primary' : 'btn-ghost']"
        title="Heading"
      >
        <span class="font-semibold">H3</span>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="['btn btn-sm', editor.isActive('bulletList') ? 'btn-primary' : 'btn-ghost']"
        title="Bullet List"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm-2-7a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="['btn btn-sm', editor.isActive('orderedList') ? 'btn-primary' : 'btn-ghost']"
        title="Ordered List"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 011 1v.5h.5a.5.5 0 010 1H3.5v.5a.5.5 0 01-1 0V4a1 1 0 011-1zm4 1a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zM3 9a.5.5 0 01.5-.5h1a.5.5 0 01.354.854L3.707 10.5H4.5a.5.5 0 010 1h-1a.5.5 0 01-.354-.854L4.293 9.5H3.5A.5.5 0 013 9zm0 4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v.15l-.35.35.35.35V15a.5.5 0 01-.5.5h-1a.5.5 0 010-1h.5v-.2l-.35-.3.35-.3V14h-.5a.5.5 0 01-.5-.5z" />
        </svg>
      </button>
    </div>

    <!-- Editor Content -->
    <EditorContent
      :editor="editor"
      class="scope-terms-content"
    />
  </div>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getHTML() !== newValue) {
    editor.value.commands.setContent(newValue, false)
  }
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
/* Toolbar button size consistency */
.btn.btn-sm {
  min-width: 2rem;
  min-height: 2rem;
  padding: 0.25rem 0.5rem;
}
</style>

<style>
/* Editor content styles — unscoped so they apply to tiptap content */
.scope-terms-content .tiptap {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-b-md;
  @apply bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500;
  @apply focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900;
  min-height: 150px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.scope-terms-content .tiptap h3 {
  @apply text-lg font-semibold mb-2 text-gray-900 dark:text-gray-50;
}
.scope-terms-content .tiptap p {
  @apply mb-2;
}
.scope-terms-content .tiptap ul {
  @apply list-disc pl-5 mb-2;
}
.scope-terms-content .tiptap ol {
  @apply list-decimal pl-5 mb-2;
}
.scope-terms-content .tiptap li {
  @apply mb-1;
}
.scope-terms-content .tiptap strong {
  @apply font-bold;
}
.scope-terms-content .tiptap em {
  @apply italic;
}
</style>
