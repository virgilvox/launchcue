import type { AiAdapter } from '../types'
import apiService from '@/services/api.service'

export class NetlifyAiAdapter implements AiAdapter {
  async process(data: { prompt: string; processingDetails: { type: string; context: string; enriched: boolean }; max_tokens: number }): Promise<unknown> {
    return apiService.processWithClaude(data)
  }
}
