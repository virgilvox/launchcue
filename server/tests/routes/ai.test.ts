import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { aiRouter } from '../../src/routes/ai.js'
import { getSupabase } from '../../src/supabase.js'

// Helpers ────────────────────────────────────────────────

/** Stub auth so all requests pass as an authenticated user */
function stubAuth() {
  const sb = getSupabase() as any
  sb.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-uuid-1',
        email: 'dev@example.com',
        user_metadata: { current_team_id: 'team-1' },
      },
    },
    error: null,
  })
}

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/ai', aiRouter)
  return app
}

// ────────────────────────────────────────────────────────

describe('AI Route — POST /ai/process', () => {
  let app: express.Express
  let originalFetch: typeof globalThis.fetch
  let originalKey: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
    stubAuth()
    originalFetch = globalThis.fetch
    originalKey = process.env.ANTHROPIC_API_KEY
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.ANTHROPIC_API_KEY = originalKey
  })

  it('returns 200 with AI response on valid request', async () => {
    const mockAiResponse = {
      id: 'msg_123',
      content: [{ type: 'text', text: 'Processed output' }],
    }
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAiResponse),
    }) as any

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: 'Organize my brain dump' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockAiResponse)
    expect(globalThis.fetch).toHaveBeenCalledOnce()

    // Verify the fetch was called with correct Anthropic endpoint
    const [url, opts] = (globalThis.fetch as any).mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(opts.headers['x-api-key']).toBe('test-anthropic-key')
  })

  it('returns 400 when prompt is missing', async () => {
    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('returns 400 when prompt is empty string', async () => {
    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: '' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('returns 400 when prompt exceeds 50,000 characters', async () => {
    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: 'x'.repeat(50001) })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('uses general type when processingDetails.type is not in enum', async () => {
    // Zod has a default('general') so missing type should be fine
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'msg_456', content: [] }),
    }) as any

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({
        prompt: 'Process this',
        processingDetails: { context: 'some context' },
      })

    expect(res.status).toBe(200)
  })

  it('supports explicit processingDetails.type values', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'msg_789', content: [] }),
    }) as any

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({
        prompt: 'Make tasks from this',
        processingDetails: { type: 'braindump', context: 'Q1 planning' },
      })

    expect(res.status).toBe(200)
    const body = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body)
    expect(body.messages).toHaveLength(2) // context + prompt
  })

  it('returns 500 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: 'hello' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('AI service not configured')
  })

  it('forwards Anthropic error status when API returns non-ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited by Anthropic' } }),
    }) as any

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: 'hello' })

    expect(res.status).toBe(429)
    expect(res.body.error).toBe('Rate limited by Anthropic')
  })

  it('returns 500 when fetch throws a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Network timeout')) as any

    const res = await request(app)
      .post('/ai/process')
      .set('Authorization', 'Bearer valid-token')
      .send({ prompt: 'hello' })

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('AI processing failed')
  })

  it('returns 401 without auth header', async () => {
    const res = await request(app)
      .post('/ai/process')
      .send({ prompt: 'hello' })

    expect(res.status).toBe(401)
  })
})
