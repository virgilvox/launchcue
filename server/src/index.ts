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
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Start ───

app.listen(port, () => {
  console.log(`LaunchCue API server running on port ${port}`)

  // Start webhook queue processor (runs every 30 seconds)
  startWebhookProcessor()
})

export default app
