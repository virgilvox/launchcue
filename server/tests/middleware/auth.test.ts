import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { requireAuth } from '../../src/middleware/auth.js'
import { getSupabase } from '../../src/supabase.js'

// Build a mini app that uses requireAuth then returns the user
function createApp() {
  const app = express()
  app.use(express.json())
  app.get('/test', requireAuth, (req: any, res) => {
    res.json({ user: req.user })
  })
  return app
}

describe('requireAuth middleware', () => {
  let app: express.Express

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/test')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Missing authorization header')
  })

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Token abc123')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Missing authorization header')
  })

  it('returns 401 when Supabase rejects the token', async () => {
    const sb = getSupabase() as any
    sb.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' },
    })

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid or expired token')
  })

  it('returns 401 when Supabase returns no user and no error', async () => {
    const sb = getSupabase() as any
    sb.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer orphan-token')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid or expired token')
  })

  it('passes through with user info on valid token', async () => {
    const sb = getSupabase() as any
    sb.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'auth-uuid-1',
          email: 'dev@example.com',
          user_metadata: { current_team_id: 'team-uuid-1' },
        },
      },
      error: null,
    })

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer valid-token')
    expect(res.status).toBe(200)
    expect(res.body.user).toEqual({
      authId: 'auth-uuid-1',
      email: 'dev@example.com',
      teamId: 'team-uuid-1',
    })
  })

  it('passes through without teamId when user_metadata has none', async () => {
    const sb = getSupabase() as any
    sb.auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'auth-uuid-2',
          email: 'solo@example.com',
          user_metadata: {},
        },
      },
      error: null,
    })

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer valid-token')
    expect(res.status).toBe(200)
    expect(res.body.user.teamId).toBeUndefined()
  })
})
