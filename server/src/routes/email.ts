import { Router } from 'express'
import nodemailer from 'nodemailer'
import { z } from 'zod'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import { getSupabase } from '../supabase.js'

export const emailRouter = Router()

emailRouter.use(requireAuth)

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().max(200).optional(),
  inviteUrl: z.string().url('Invalid invite URL'),
  teamName: z.string().max(200).optional(),
  type: z.enum(['team', 'client']).default('team'),
})

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailgun.org',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * POST /api/email/invite — Send team or client invitation email
 */
emailRouter.post('/invite', validateBody(inviteSchema), async (req, res) => {
  const { email, name, inviteUrl, teamName, type } = req.body
  const { email: senderEmail, authId, teamId } = (req as AuthenticatedRequest).user

  // Verify sender has admin/owner role in the team
  if (!teamId) {
    res.status(403).json({ error: 'No team context' })
    return
  }

  const sb = getSupabase()
  const { data: userData } = await sb
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single()

  if (!userData) {
    res.status(403).json({ error: 'User not found' })
    return
  }

  const { data: membership } = await sb
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userData.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    res.status(403).json({ error: 'Admin access required to send invitations' })
    return
  }

  // Validate inviteUrl is HTTPS (Zod already validated URL format)
  try {
    const parsed = new URL(inviteUrl)
    if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV === 'development' && parsed.protocol === 'http:')) {
      res.status(400).json({ error: 'Invite URL must use HTTPS' })
      return
    }
  } catch {
    res.status(400).json({ error: 'Invalid invite URL' })
    return
  }

  // Sanitize user inputs to prevent HTML injection in email
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const safeName = esc(name || 'there')
  const safeTeamName = esc(teamName || '')
  const safeSenderEmail = esc(senderEmail)
  const safeInviteUrl = encodeURI(inviteUrl)

  const subject = type === 'client'
    ? `You've been invited to collaborate on ${safeTeamName}`
    : `You've been invited to join ${safeTeamName}`

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="font-family: 'Space Grotesk', sans-serif;">LaunchCue Invitation</h2>
      <p>Hi ${safeName},</p>
      <p>${safeSenderEmail} has invited you to ${type === 'client' ? 'collaborate on' : 'join'} <strong>${safeTeamName}</strong> on LaunchCue.</p>
      <a href="${safeInviteUrl}" style="display: inline-block; padding: 12px 24px; background: #7C3AED; color: white; text-decoration: none; border: 2px solid #000; font-weight: 600;">
        Accept Invitation
      </a>
      <p style="margin-top: 24px; color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
    </div>
  `

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@launchcue.dev',
      to: email,
      subject,
      html,
    })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' })
  }
})
