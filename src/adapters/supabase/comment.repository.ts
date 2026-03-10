import type { Comment } from '@/types/models'
import type { CommentRepository } from '../types'
import { getSupabase } from './client'

async function getCurrentUserId(): Promise<{ userId: string; teamId: string }> {
  const sb = getSupabase()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const teamId = user.user_metadata?.current_team_id
  if (!teamId) throw new Error('No team selected')
  // Resolve app user ID from auth_id
  const { data: appUser, error } = await sb.from('users').select('id').eq('auth_id', user.id).single()
  if (error || !appUser) throw new Error('User not found')
  return { userId: appUser.id, teamId }
}

export class SupabaseCommentRepository implements CommentRepository {
  async getComments(resourceType: string, resourceId: string): Promise<Comment[]> {
    let query = getSupabase()
      .from('comments')
      .select('*, users(name)')

    // If resourceType and resourceId are provided, filter by them.
    // Otherwise return recent comments for the team (RLS handles team scoping).
    if (resourceType && resourceId) {
      query = query.eq('resource_type', resourceType).eq('resource_id', resourceId)
        .order('created_at', { ascending: true })
    } else {
      query = query.order('created_at', { ascending: false }).limit(20)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async createComment(resourceType: string, resourceId: string, data: { content: string }): Promise<Comment> {
    const { userId, teamId } = await getCurrentUserId()
    const { data: row, error } = await getSupabase()
      .from('comments')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        content: data.content,
        user_id: userId,
        team_id: teamId,
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
