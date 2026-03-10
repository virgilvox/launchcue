import type { AiAdapter } from '../types'

/**
 * Supabase AI adapter — delegates to Express API server for AI processing.
 * Brain dump processing requires server-side API keys, so this calls the Express server.
 */
export class SupabaseAiAdapter implements AiAdapter {
  private apiUrl: string

  constructor() {
    this.apiUrl = import.meta.env.VITE_API_URL || '/api'
  }

  async process(data: { prompt: string; processingDetails: { type: string; context: string; enriched: boolean }; max_tokens: number }): Promise<unknown> {
    const response = await fetch(`${this.apiUrl}/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'AI processing failed' }))
      throw new Error(error.message || 'AI processing failed')
    }

    return response.json()
  }
}
