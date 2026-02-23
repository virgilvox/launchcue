<template>
  <div class="rich-text-editor">
    <!-- Toolbar -->
    <div
      v-if="editor"
      class="toolbar flex flex-wrap items-center gap-0.5 p-2 border border-b-0 border-gray-300 dark:border-gray-600 rounded-t-md bg-gray-50 dark:bg-gray-700"
    >
      <!-- Text Formatting -->
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="['toolbar-btn', { active: editor.isActive('bold') }]"
        title="Bold"
      >
        <span class="font-bold text-sm">B</span>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="['toolbar-btn', { active: editor.isActive('italic') }]"
        title="Italic"
      >
        <span class="italic text-sm">I</span>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="['toolbar-btn', { active: editor.isActive('strike') }]"
        title="Strikethrough"
      >
        <span class="line-through text-sm">S</span>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <!-- Headings -->
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="['toolbar-btn', { active: editor.isActive('heading', { level: 1 }) }]"
        title="Heading 1"
      >
        <span class="text-sm font-semibold">H1</span>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="['toolbar-btn', { active: editor.isActive('heading', { level: 2 }) }]"
        title="Heading 2"
      >
        <span class="text-sm font-semibold">H2</span>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="['toolbar-btn', { active: editor.isActive('heading', { level: 3 }) }]"
        title="Heading 3"
      >
        <span class="text-sm font-semibold">H3</span>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <!-- Lists -->
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="['toolbar-btn', { active: editor.isActive('bulletList') }]"
        title="Bullet List"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm-2-7a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2zm0 4a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="['toolbar-btn', { active: editor.isActive('orderedList') }]"
        title="Ordered List"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 3a1 1 0 011 1v.5h.5a.5.5 0 010 1H3.5v.5a.5.5 0 01-1 0V4a1 1 0 011-1zm4 1a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H8a1 1 0 01-1-1zM3 9a.5.5 0 01.5-.5h1a.5.5 0 01.354.854L3.707 10.5H4.5a.5.5 0 010 1h-1a.5.5 0 01-.354-.854L4.293 9.5H3.5A.5.5 0 013 9zm0 4.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v.15l-.35.35.35.35V15a.5.5 0 01-.5.5h-1a.5.5 0 010-1h.5v-.2l-.35-.3.35-.3V14h-.5a.5.5 0 01-.5-.5z" />
        </svg>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <!-- Block Formatting -->
      <button
        type="button"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="['toolbar-btn', { active: editor.isActive('blockquote') }]"
        title="Blockquote"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="['toolbar-btn', { active: editor.isActive('codeBlock') }]"
        title="Code Block"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <!-- Link -->
      <button
        type="button"
        @click="setLink"
        :class="['toolbar-btn', { active: editor.isActive('link') }]"
        title="Link"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd" />
        </svg>
      </button>

      <div class="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>

      <!-- Undo / Redo -->
      <button
        type="button"
        @click="editor.chain().focus().undo().run()"
        :disabled="!editor.can().undo()"
        class="toolbar-btn"
        title="Undo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        @click="editor.chain().focus().redo().run()"
        :disabled="!editor.can().redo()"
        class="toolbar-btn"
        title="Redo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>

    <!-- Editor Content -->
    <EditorContent
      :editor="editor"
      class="editor-content"
    />
  </div>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Start writing...'
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary-600 dark:text-primary-400 underline'
      }
    })
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (editor.value && editor.value.getHTML() !== newValue) {
    editor.value.commands.setContent(newValue, false)
  }
})

function setLink() {
  if (!editor.value) return

  if (editor.value.isActive('link')) {
    editor.value.chain().focus().unsetLink().run()
    return
  }

  const url = window.prompt('Enter URL:')
  if (url) {
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
}

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})
</script>

<style scoped>
.toolbar-btn {
  @apply p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors;
  @apply disabled:opacity-40 disabled:cursor-not-allowed;
  min-width: 28px;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn.active {
  @apply bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300;
}
</style>

<style>
/* Editor content styles - unscoped so they apply to tiptap content */
.editor-content .tiptap {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-b-md;
  @apply bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 focus:border-primary-500;
  @apply focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900;
  min-height: 200px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.editor-content .tiptap p.is-editor-empty:first-child::before {
  @apply text-gray-400 dark:text-gray-400;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Prose styling inside editor */
.editor-content .tiptap h1 {
  @apply text-2xl font-bold mb-3 text-gray-900 dark:text-gray-50;
}
.editor-content .tiptap h2 {
  @apply text-xl font-bold mb-2 text-gray-900 dark:text-gray-50;
}
.editor-content .tiptap h3 {
  @apply text-lg font-semibold mb-2 text-gray-900 dark:text-gray-50;
}
.editor-content .tiptap p {
  @apply mb-2;
}
.editor-content .tiptap ul {
  @apply list-disc pl-5 mb-2;
}
.editor-content .tiptap ol {
  @apply list-decimal pl-5 mb-2;
}
.editor-content .tiptap li {
  @apply mb-1;
}
.editor-content .tiptap blockquote {
  @apply border-l-4 border-gray-300 dark:border-gray-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-2;
}
.editor-content .tiptap pre {
  @apply bg-gray-100 dark:bg-gray-800 rounded-md p-3 mb-2 overflow-x-auto;
}
.editor-content .tiptap code {
  @apply bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono;
}
.editor-content .tiptap pre code {
  @apply bg-transparent p-0;
}
.editor-content .tiptap hr {
  @apply border-gray-300 dark:border-gray-600 my-4;
}
.editor-content .tiptap strong {
  @apply font-bold;
}
.editor-content .tiptap em {
  @apply italic;
}
.editor-content .tiptap s {
  @apply line-through;
}
</style>
