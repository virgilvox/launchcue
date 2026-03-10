import type { Notification } from '@/types/models'
import type { NotificationRepository } from '../types'
import { getSupabase } from './client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export class SupabaseNotificationRepository implements NotificationRepository {
  private channel: RealtimeChannel | null = null

  async getAll(): Promise<Notification[]> {
    const { data, error } = await getSupabase()
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)

    return (data || []).map((row: Record<string, unknown>) => this.mapFromDb(row))
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
