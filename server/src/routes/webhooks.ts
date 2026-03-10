import { Router } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { getSupabase } from '../supabase.js'

export const webhookRouter = Router()

webhookRouter.use(requireAuth)

/**
 * GET /api/webhooks/queue — View pending webhook deliveries (admin only)
 */
webhookRouter.get('/queue', async (req, res) => {
  const { teamId, authId } = (req as AuthenticatedRequest).user
  if (!teamId) {
    res.status(400).json({ error: 'No active team' })
    return
  }

  // Admin-only: check the user's role in team_members
  try {
    const sb = getSupabase()
    const { data: userRow } = await sb
      .from('users')
      .select('id')
      .eq('auth_id', authId)
      .single()
    if (!userRow) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    const { data: membership } = await sb
      .from('team_members')
      .select('role')
      .eq('user_id', userRow.id)
      .eq('team_id', teamId)
      .single()
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      res.status(403).json({ error: 'Admin access required' })
      return
    }
  } catch {
    res.status(500).json({ error: 'Failed to verify permissions' })
    return
  }

  try {
    const { data, error } = await getSupabase()
      .from('webhook_queue')
      .select('*, webhooks(url, events)')
      .eq('webhooks.team_id', teamId)
      .is('completed_at', null)
      .is('failed_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch webhook queue' })
  }
})
