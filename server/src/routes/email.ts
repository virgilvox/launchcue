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

  const subject = type === 'client'
    ? `You've been invited to collaborate on ${teamName}`
    : `You've been invited to join ${teamName}`

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="font-family: 'Space Grotesk', sans-serif;">LaunchCue Invitation</h2>
      <p>Hi ${name || 'there'},</p>
      <p>${senderEmail} has invited you to ${type === 'client' ? 'collaborate on' : 'join'} <strong>${teamName}</strong> on LaunchCue.</p>
      <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #7C3AED; color: white; text-decoration: none; border: 2px solid #000; font-weight: 600;">
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
