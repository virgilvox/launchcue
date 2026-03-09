import type { SearchResult } from '@/types/api'
import type { SearchAdapter } from '../types'
import apiService from '@/services/api.service'

export class NetlifySearchAdapter implements SearchAdapter {
  async search(query: string, types?: string[]): Promise<SearchResult[]> {
    return apiService.search(query, types ?? null)
  }
}
