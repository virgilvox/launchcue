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
        max_tokens: max_tokens || 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        system: processingDetails?.context
          ? `You are a DevRel assistant helping organize brain dumps. Context: ${processingDetails.context}`
          : 'You are a DevRel assistant helping organize brain dumps into actionable items.',
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
