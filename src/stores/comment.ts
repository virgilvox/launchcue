import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getContainer } from '@/core/service-container'
import { getEventBus } from '@/core/event-bus'
import { COMMENT_REPO } from '@/adapters/repository-keys'
import type { CommentRepository } from '@/adapters/types'
import type { Comment } from '../types/models'
import { useAuthStore } from './auth'

export const useCommentStore = defineStore('comment', () => {
  const comments = ref<Comment[]>([])
  const isLoading = ref(false)

  function getRepo() {
    return getContainer().resolve<CommentRepository>(COMMENT_REPO)
  }

  const fetchComments = async (resourceType: string, resourceId: string): Promise<Comment[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      const response = await getRepo().getComments(resourceType, resourceId)
      comments.value = Array.isArray(response) ? response : []
      return comments.value
    } catch (error) {
      comments.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const getRecentComments = async (): Promise<Comment[]> => {
    if (!useAuthStore().currentTeam) return []
    isLoading.value = true
    try {
      // Fetch all comments for the team (RLS scoped) without resource filter
      const response = await getRepo().getComments('all', 'all')
      comments.value = Array.isArray(response) ? response : []
      return comments.value
    } catch (error) {
      comments.value = []
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const createComment = async (resourceType: string, resourceId: string, data: { content: string }): Promise<Comment> => {
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      const created = await getRepo().createComment(resourceType, resourceId, data)
      comments.value.push(created)
      getEventBus().emit('comment.created', { comment: created })
      return created
    } catch (error) {
      throw error
    }
  }

  const deleteComment = async (id: string): Promise<void> => {
    if (!id) throw new Error('Comment ID is required for deletion')
    if (!useAuthStore().currentTeam) throw new Error('No team context')
    try {
      await getRepo().deleteComment(id)
      comments.value = comments.value.filter(c => c.id !== id)
      getEventBus().emit('comment.deleted', { id })
    } catch (error) {
      throw error
    }
  }

  return {
    comments,
    isLoading,
    fetchComments,
    getRecentComments,
    createComment,
    deleteComment
  }
})
