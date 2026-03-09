import apiService from './api.service'
import type { Comment } from '@/types/models'

const COMMENT_ENDPOINT = '/.netlify/functions/comments'

export default {
  getComments(resourceType: string, resourceId: string): Promise<Comment[]> {
    return apiService.get<Comment[]>(COMMENT_ENDPOINT, { resourceType, resourceId })
  },
  getRecentComments(): Promise<Comment[]> {
    return apiService.get<Comment[]>(COMMENT_ENDPOINT)
  },
  createComment(data: { content: string; resourceType: string; resourceId: string }): Promise<Comment> {
    return apiService.post<Comment>(COMMENT_ENDPOINT, data)
  },
  updateComment(id: string, data: Partial<{ content: string }>): Promise<Comment> {
    return apiService.put<Comment>(`${COMMENT_ENDPOINT}/${id}`, data)
  },
  deleteComment(id: string): Promise<void> {
    return apiService.delete(`${COMMENT_ENDPOINT}/${id}`) as Promise<void>
  }
}
