import { Router, type Request } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

export const aiRouter = Router()

aiRouter.use(requireAuth)

// Per-user rate limit for expensive AI calls
const aiUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: (req: Request) => (req as AuthenticatedRequest).user?.authId || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please try again later.' },
})
aiRouter.use(aiUserLimiter)

const aiProcessSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(50000, 'Prompt exceeds 50,000 character limit'),
  processingDetails: z.object({
    type: z.enum(['braindump', 'task', 'project', 'note', 'general']).default('general'),
    context: z.string().max(5000).optional(),
  }).optional(),
  max_tokens: z.number().int().min(1).max(4096).default(1024),
})

/**
 * POST /api/ai/process — Brain dump AI processing
 * Delegates to Anthropic API (server-side key).
 */
aiRouter.post('/process', validateBody(aiProcessSchema), async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured' })
    return
  }

  const { prompt, processingDetails, max_tokens } = req.body
  const processType = processingDetails?.type || 'general'

  // Build messages — user-provided context goes in a separate user message, not system prompt
  const messages: Array<{ role: string; content: string }> = []
  if (processingDetails?.context) {
    messages.push({
      role: 'user',
      content: `Context for processing (type: ${processType}):\n${processingDetails.context}`,
    })
  }
  messages.push({
    role: 'user',
    content: prompt,
  })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens,
        messages,
        system: 'You are a DevRel assistant helping organize brain dumps into actionable items.',
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'AI request failed' } }))
      res.status(response.status).json({ error: error.error?.message || 'AI request failed' })
      return
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'AI processing failed' })
  }
})
