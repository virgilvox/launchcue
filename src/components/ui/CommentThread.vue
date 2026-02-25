<template>
  <div class="comment-thread">
    <h4 class="text-base font-semibold text-[var(--text-primary)] mb-4">Comments</h4>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="animate-pulse flex space-x-3">
        <div class="w-8 h-8 rounded-full bg-[var(--surface)] flex-shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-[var(--surface)] rounded w-1/4"></div>
          <div class="h-3 bg-[var(--surface)] rounded w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- Comments list -->
    <div v-else-if="comments.length > 0" class="space-y-4 mb-6">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="flex space-x-3"
      >
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white"
          :style="{ backgroundColor: getAvatarColor(comment.userName) }"
        >
          {{ getInitial(comment.userName) }}
        </div>

        <!-- Comment body -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-[var(--text-primary)]">
              {{ comment.userName }}
            </span>
            <span class="text-xs text-[var(--text-secondary)]">
              {{ formatTime(comment.createdAt) }}
            </span>
            <span
              v-if="comment.updatedAt && comment.updatedAt !== comment.createdAt"
              class="text-xs text-[var(--text-secondary)]"
            >
              (edited)
            </span>
          </div>

          <!-- Edit mode -->
          <div v-if="editingId === comment.id" class="mt-1">
            <textarea
              v-model="editContent"
              rows="3"
              class="w-full px-3 py-2 text-sm border border-[var(--border-light)]
                     bg-[var(--surface-elevated)] text-[var(--text-primary)]
                     focus:border-[var(--accent-primary)] resize-none"
              @keydown.meta.enter="saveEdit(comment.id)"
              @keydown.ctrl.enter="saveEdit(comment.id)"
            ></textarea>
            <div class="flex items-center space-x-2 mt-2">
              <button
                @click="saveEdit(comment.id)"
                :disabled="isSaving || !editContent.trim()"
                class="px-3 py-1 text-xs font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSaving ? 'Saving...' : 'Save' }}
              </button>
              <button
                @click="cancelEdit"
                class="px-3 py-1 text-xs font-medium text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Display mode -->
          <div v-else>
            <p class="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap break-words">
              {{ comment.content }}
            </p>

            <!-- Edit/Delete actions for own comments -->
            <div
              v-if="isOwnComment(comment)"
              class="flex items-center space-x-3 mt-1"
            >
              <button
                @click="startEdit(comment)"
                class="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Edit
              </button>
              <button
                @click="deleteComment(comment.id)"
                class="text-xs text-[var(--text-secondary)] hover:text-[var(--danger)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-6 mb-4">
      <p class="text-sm text-[var(--text-secondary)]">No comments yet. Be the first to comment.</p>
    </div>

    <!-- New comment form -->
    <div class="border-t border-[var(--border-light)] pt-4">
      <div class="flex space-x-3">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white bg-[var(--accent-primary)]"
        >
          {{ currentUserInitial }}
        </div>
        <div class="flex-1">
          <textarea
            v-model="newComment"
            rows="3"
            placeholder="Add a comment..."
            class="w-full px-3 py-2 text-sm border border-[var(--border-light)]
                   bg-[var(--surface-elevated)] text-[var(--text-primary)]
                   placeholder-[var(--text-secondary)]
                   focus:border-[var(--accent-primary)] resize-none"
            @keydown.meta.enter="submitComment"
            @keydown.ctrl.enter="submitComment"
          ></textarea>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-[var(--text-secondary)]">
              Press Cmd+Enter to submit
            </span>
            <button
              @click="submitComment"
              :disabled="isSaving || !newComment.trim()"
              class="px-4 py-1.5 text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
            >
              {{ isSaving ? 'Posting...' : 'Comment' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '../../stores/auth'
import commentService from '../../services/comment.service'

const props = defineProps({
  resourceType: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    required: true
  }
})

const authStore = useAuthStore()
const toast = useToast()

const comments = ref([])
const isLoading = ref(false)
const isSaving = ref(false)
const newComment = ref('')
const editingId = ref(null)
const editContent = ref('')

const currentUserInitial = computed(() => {
  const name = authStore.user?.name || ''
  return name.charAt(0).toUpperCase() || '?'
})

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase()
}

// Generate a consistent color from a name string
function getAvatarColor(name) {
  const colors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  ]
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

function isOwnComment(comment) {
  return comment.userId === authStore.user?.id
}

async function fetchComments() {
  isLoading.value = true
  try {
    const data = await commentService.getComments(props.resourceType, props.resourceId)
    comments.value = Array.isArray(data) ? data : []
  } catch (error) {
    toast.error('Failed to load comments. Please try again.')
    comments.value = []
  } finally {
    isLoading.value = false
  }
}

async function submitComment() {
  if (!newComment.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const created = await commentService.createComment({
      resourceType: props.resourceType,
      resourceId: props.resourceId,
      content: newComment.value.trim(),
    })
    comments.value.push(created)
    newComment.value = ''
  } catch (error) {
    toast.error('Failed to post comment. Please try again.')
  } finally {
    isSaving.value = false
  }
}

function startEdit(comment) {
  editingId.value = comment.id
  editContent.value = comment.content
}

function cancelEdit() {
  editingId.value = null
  editContent.value = ''
}

async function saveEdit(id) {
  if (!editContent.value.trim() || isSaving.value) return

  isSaving.value = true
  try {
    const updated = await commentService.updateComment(id, {
      content: editContent.value.trim(),
    })
    const idx = comments.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      comments.value[idx] = updated
    }
    editingId.value = null
    editContent.value = ''
  } catch (error) {
    toast.error('Failed to update comment. Please try again.')
  } finally {
    isSaving.value = false
  }
}

async function deleteComment(id) {
  if (!confirm('Are you sure you want to delete this comment?')) return

  try {
    await commentService.deleteComment(id)
    comments.value = comments.value.filter(c => c.id !== id)
  } catch (error) {
    toast.error('Failed to delete comment. Please try again.')
  }
}

onMounted(() => {
  fetchComments()
})
</script>
