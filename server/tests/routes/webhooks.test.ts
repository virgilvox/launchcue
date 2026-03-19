import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { webhookRouter } from '../../src/routes/webhooks.js'
import { getSupabase } from '../../src/supabase.js'

// Helpers ────────────────────────────────────────────────

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/webhooks', webhookRouter)
  return app
}

function stubAuth(opts: { teamId?: string } = { teamId: 'team-1' }) {
  const sb = getSupabase() as any
  sb.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-uuid-1',
        email: 'admin@example.com',
        user_metadata: { current_team_id: opts.teamId },
      },
    },
    error: null,
  })
}

function stubSupabaseRole(role: string) {
  const sb = getSupabase() as any
  let singleCallCount = 0
  sb._query.single.mockImplementation(() => {
    singleCallCount++
    if (singleCallCount === 1) {
      return Promise.resolve({ data: { id: 'user-uuid-1' }, error: null })
    }
    return Promise.resolve({ data: { role }, error: null })
  })
}

function stubSupabaseQueueData(data: any[]) {
  const sb = getSupabase() as any
  // After the role check, the next chain of from().select().eq().is().is().order().limit()
  // must resolve with data. We override limit() to return the final value.
  sb._query.limit.mockResolvedValueOnce({ data, error: null })
}

// ────────────────────────────────────────────────────────

describe('Webhooks Route — GET /webhooks/queue', () => {
  let app: express.Express

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
  })

  it('returns 401 without auth header', async () => {
    const res = await request(app).get('/webhooks/queue')
    expect(res.status).toBe(401)
  })

  it('returns 400 when user has no team context', async () => {
    stubAuth({ teamId: undefined })

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No active team')
  })

  it('returns 403 when user is a regular member', async () => {
    stubAuth({ teamId: 'team-1' })
    stubSupabaseRole('member')

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Admin access required')
  })

  it('returns 403 when user is not found in users table', async () => {
    stubAuth({ teamId: 'team-1' })
    const sb = getSupabase() as any
    sb._query.single.mockResolvedValueOnce({ data: null, error: null })

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Forbidden')
  })

  it('returns 200 with queue data for admin user', async () => {
    stubAuth({ teamId: 'team-1' })
    stubSupabaseRole('admin')

    const queueItems = [
      { id: 'q1', payload: { event: 'task.created' }, webhooks: { url: 'https://hook.example.com', events: ['task.created'] } },
      { id: 'q2', payload: { event: 'project.updated' }, webhooks: { url: 'https://hook.example.com', events: ['project.updated'] } },
    ]
    stubSupabaseQueueData(queueItems)

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual(queueItems)
  })

  it('returns 200 with queue data for owner user', async () => {
    stubAuth({ teamId: 'team-1' })
    stubSupabaseRole('owner')
    stubSupabaseQueueData([])

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 500 when queue query fails', async () => {
    stubAuth({ teamId: 'team-1' })
    stubSupabaseRole('admin')

    const sb = getSupabase() as any
    sb._query.limit.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    const res = await request(app)
      .get('/webhooks/queue')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to fetch webhook queue')
  })
})
