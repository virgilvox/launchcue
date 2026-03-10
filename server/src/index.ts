import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { aiRouter } from './routes/ai.js'
import { webhookRouter } from './routes/webhooks.js'
import { emailRouter } from './routes/email.js'
import { startWebhookProcessor } from './webhook-processor.js'

const app = express()
const port = process.env.PORT || 3001

// ─── Middleware ───

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['http://localhost:5173'],
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

// Security headers
app.use((_req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${process.env.SUPABASE_URL || 'http://localhost:8000'}`,
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
  ].join('; '))
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

// Global rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// ─── Routes ───

app.use('/ai', aiRouter)
app.use('/webhooks', webhookRouter)
app.use('/email', emailRouter)

// Health check with DB ping
app.get('/health', async (_req, res) => {
  let dbOk = false
  try {
    const { getSupabase: getSb } = await import('./supabase.js')
    const { error } = await getSb().from('users').select('id').limit(1)
    dbOk = !error
  } catch { /* db unreachable */ }
  const status = dbOk ? 'ok' : 'degraded'
  res.status(dbOk ? 200 : 503).json({ status, db: dbOk, timestamp: new Date().toISOString() })
})

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

// ─── Start ───

app.listen(port, () => {
  console.log(`LaunchCue API server running on port ${port}`)

  // Start webhook queue processor (runs every 30 seconds)
  startWebhookProcessor()
})

export default app
