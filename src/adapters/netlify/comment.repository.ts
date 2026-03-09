import type { Comment } from '@/types/models'
import type { CommentRepository } from '../types'
import apiService from '@/services/api.service'

const COMMENT_ENDPOINT = '/.netlify/functions/comments'

export class NetlifyCommentRepository implements CommentRepository {
  async getComments(resourceType: string, resourceId: string): Promise<Comment[]> {
    return apiService.get<Comment[]>(COMMENT_ENDPOINT, { resourceType, resourceId })
  }

  async createComment(resourceType: string, resourceId: string, data: { content: string }): Promise<Comment> {
    return apiService.post<Comment>(COMMENT_ENDPOINT, { ...data, resourceType, resourceId })
  }

  async deleteComment(id: string): Promise<void> {
    await apiService.delete(`${COMMENT_ENDPOINT}/${id}`)
  }
}
