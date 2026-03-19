import type { Notification } from '@/types/models'
import type { NotificationRepository, PaginationOptions, PaginatedResult } from '../types'
import { getSupabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export class SupabaseNotificationRepository implements NotificationRepository {
  private channel: RealtimeChannel | null = null

  async getAll(teamId?: string): Promise<Notification[]> {
    let query = getSupabase()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    // Defense-in-depth: filter by team_id even though RLS handles it
    if (teamId) {
      query = query.eq('team_id', teamId)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
  }

  async getPaginated(options: PaginationOptions): Promise<PaginatedResult<Notification>> {
    const from = (options.page - 1) * options.limit
    const to = from + options.limit - 1

    const { data, count, error } = await getSupabase()
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(error.message)

    const total = count || 0
    return {
      data: (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row)),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    }
  }

  async markRead(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async markAllRead(): Promise<void> {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    if (error) throw new Error(error.message)
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('notifications')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  /**
   * Subscribe to real-time notifications via Supabase Realtime.
   * Replaces 60s polling with instant push.
   */
  subscribe(callback: (notification: Notification) => void): () => void {
    const sb = getSupabase()

    this.channel = sb
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          callback(this.mapFromDb(payload.new as Record<string, unknown>))
        }
      )
      .subscribe()

    return () => {
      if (this.channel) {
        sb.removeChannel(this.channel)
        this.channel = null
      }
    }
  }

  private mapFromDb(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      type: row.type as Notification['type'],
      title: row.title as string,
      message: row.message as string,
      read: row.read as boolean,
      resourceType: row.resource_type as string | undefined,
      resourceId: row.resource_id as string | undefined,
      createdAt: row.created_at as string,
    }
  }
}
