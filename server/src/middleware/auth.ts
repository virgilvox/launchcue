import type { Request, Response, NextFunction } from 'express'
import { getSupabase } from '../supabase.js'

/**
 * Verify Supabase JWT from Authorization header.
 * Attaches user info to req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await getSupabase().auth.getUser(token)

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  // Attach user info to request
  ;(req as AuthenticatedRequest).user = {
    authId: user.id,
    email: user.email!,
    teamId: user.user_metadata?.current_team_id,
  }

  next()
}

export interface AuthenticatedRequest extends Request {
  user: {
    authId: string
    email: string
    teamId?: string
  }
}
