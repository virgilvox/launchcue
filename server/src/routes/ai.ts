import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

export const aiRouter = Router()

aiRouter.use(requireAuth)

/**
 * POST /api/ai/process — Brain dump AI processing
 * Delegates to Anthropic API (server-side key).
 */
aiRouter.post('/process', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'AI service not configured' })
    return
  }

  const { prompt, processingDetails, max_tokens } = req.body

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing or invalid prompt' })
    return
  }

  // Input validation
  if (prompt.length > 50000) {
    res.status(400).json({ error: 'Prompt exceeds maximum length of 50,000 characters' })
    return
  }

  // Validate processingDetails.type against allowlist
  const allowedTypes = ['braindump', 'task', 'project', 'note', 'general']
  const processType = allowedTypes.includes(processingDetails?.type) ? processingDetails.type : 'general'

  const clampedMaxTokens = Math.min(Math.max(Number(max_tokens) || 1024, 1), 4096)

  // Build messages — user-provided context goes in a separate user message, not system prompt
  const messages: Array<{ role: string; content: string }> = []
  if (processingDetails?.context) {
    const sanitizedContext = String(processingDetails.context).slice(0, 5000)
    messages.push({
      role: 'user',
      content: `Context for processing (type: ${processType}):\n${sanitizedContext}`,
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
        max_tokens: clampedMaxTokens,
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
