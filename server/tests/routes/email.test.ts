import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { emailRouter } from '../../src/routes/email.js'
import { getSupabase } from '../../src/supabase.js'

// Mock nodemailer
const mockSendMail = vi.fn()
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

// Helpers ────────────────────────────────────────────────

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/email', emailRouter)
  return app
}

/** Stub auth to pass with a team context */
function stubAuthWithTeam(teamId = 'team-1') {
  const sb = getSupabase() as any
  sb.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-uuid-1',
        email: 'admin@example.com',
        user_metadata: { current_team_id: teamId },
      },
    },
    error: null,
  })
}

/** Stub auth with no team context */
function stubAuthNoTeam() {
  const sb = getSupabase() as any
  sb.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'auth-uuid-1',
        email: 'solo@example.com',
        user_metadata: {},
      },
    },
    error: null,
  })
}

/** Configure the chained Supabase query mock for user + membership lookups */
function stubSupabaseAdmin(role: string = 'admin') {
  const sb = getSupabase() as any
  // Each call to sb.from() returns the _query chain. We need to differentiate
  // between the 'users' call and 'team_members' call via .single()
  let singleCallCount = 0
  sb._query.single.mockImplementation(() => {
    singleCallCount++
    if (singleCallCount === 1) {
      // users lookup
      return Promise.resolve({ data: { id: 'user-uuid-1' }, error: null })
    }
    // team_members lookup
    return Promise.resolve({ data: { role }, error: null })
  })
}

function stubSupabaseNonAdmin() {
  stubSupabaseAdmin('member')
}

const validPayload = {
  email: 'invitee@example.com',
  name: 'Test User',
  inviteUrl: 'https://launchcue.app/invite/abc',
  teamName: 'Acme DevRel',
  type: 'team',
}

// ────────────────────────────────────────────────────────

describe('Email Route — POST /email/invite', () => {
  let app: express.Express

  beforeEach(() => {
    vi.clearAllMocks()
    app = createApp()
    mockSendMail.mockResolvedValue({ messageId: 'msg-1' })
  })

  it('returns 400 when email is missing', async () => {
    stubAuthWithTeam()
    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validPayload, email: undefined })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('returns 400 when email format is invalid', async () => {
    stubAuthWithTeam()
    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validPayload, email: 'not-an-email' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
    expect(res.body.details[0].message).toContain('email')
  })

  it('returns 400 when inviteUrl is missing', async () => {
    stubAuthWithTeam()
    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send({ email: 'test@example.com' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('returns 403 when user has no team context', async () => {
    stubAuthNoTeam()
    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send(validPayload)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('No team context')
  })

  it('returns 403 when user is not admin/owner', async () => {
    stubAuthWithTeam()
    stubSupabaseNonAdmin()

    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send(validPayload)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Admin access required to send invitations')
  })

  it('returns 200 and sends email for admin user with valid data', async () => {
    stubAuthWithTeam()
    stubSupabaseAdmin('admin')

    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send(validPayload)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockSendMail).toHaveBeenCalledOnce()

    const mailOpts = mockSendMail.mock.calls[0][0]
    expect(mailOpts.to).toBe('invitee@example.com')
    expect(mailOpts.subject).toContain('Acme DevRel')
    expect(mailOpts.html).toContain('Accept Invitation')
  })

  it('returns 200 for owner role as well', async () => {
    stubAuthWithTeam()
    stubSupabaseAdmin('owner')

    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send(validPayload)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('returns 500 when sendMail throws', async () => {
    stubAuthWithTeam()
    stubSupabaseAdmin('admin')
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'))

    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send(validPayload)

    expect(res.status).toBe(500)
    expect(res.body.error).toBe('Failed to send email')
  })

  it('sends client-type invitation with different subject', async () => {
    stubAuthWithTeam()
    stubSupabaseAdmin('admin')

    const res = await request(app)
      .post('/email/invite')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validPayload, type: 'client' })

    expect(res.status).toBe(200)
    const mailOpts = mockSendMail.mock.calls[0][0]
    expect(mailOpts.subject).toContain('collaborate')
  })

  it('returns 401 without auth header', async () => {
    const res = await request(app)
      .post('/email/invite')
      .send(validPayload)

    expect(res.status).toBe(401)
  })
})
