import type { Comment } from '@/types/models'
import type { CommentRepository } from '../types'
import { getSupabase } from './client'

export class SupabaseCommentRepository implements CommentRepository {
  async getComments(resourceType: string, resourceId: string): Promise<Comment[]> {
    const { data, error } = await getSupabase()
      .from('comments')
      .select('*, users(name)')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)

    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async createComment(resourceType: string, resourceId: string, data: { content: string }): Promise<Comment> {
    const { data: row, error } = await getSupabase()
      .from('comments')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        content: data.content,
      })
      .select('*, users(name)')
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(row as Record<string, unknown>)
  }

  async updateComment(id: string, data: { content: string }): Promise<Comment> {
    const { data: row, error } = await getSupabase()
      .from('comments')
      .update({ content: data.content })
      .eq('id', id)
      .select('*, users(name)')
      .single()
    if (error) throw new Error(error.message)
    return this.mapFromDb(row as Record<string, unknown>)
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('comments')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  private mapFromDb(row: Record<string, unknown>): Comment {
    const user = row.users as Record<string, unknown> | null
    return {
      id: row.id as string,
      resourceType: row.resource_type as Comment['resourceType'],
      resourceId: row.resource_id as string,
      userId: row.user_id as string,
      userName: user?.name as string | undefined,
      content: row.content as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }
  }
}
