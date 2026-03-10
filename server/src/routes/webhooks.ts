import { Router } from 'express'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { getSupabase } from '../supabase.js'

export const webhookRouter = Router()

webhookRouter.use(requireAuth)

/**
 * GET /api/webhooks/queue — View pending webhook deliveries (admin only)
 */
webhookRouter.get('/queue', async (req, res) => {
  const { teamId } = (req as AuthenticatedRequest).user
  if (!teamId) {
    res.status(400).json({ error: 'No active team' })
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
