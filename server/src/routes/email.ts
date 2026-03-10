import { Router } from 'express'
import nodemailer from 'nodemailer'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'

export const emailRouter = Router()

emailRouter.use(requireAuth)

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
emailRouter.post('/invite', async (req, res) => {
  const { email, name, inviteUrl, teamName, type } = req.body
  const { email: senderEmail } = (req as AuthenticatedRequest).user

  if (!email || !inviteUrl) {
    res.status(400).json({ error: 'Missing email or inviteUrl' })
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email address format' })
    return
  }

  // Validate inviteUrl is a valid HTTPS URL
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
