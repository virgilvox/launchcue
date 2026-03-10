import type { SearchResult } from '@/types/api'
import type { SearchAdapter } from '../types'
import { getSupabase } from './client'

/**
 * Supabase search adapter — uses PostgreSQL full-text search via RPC.
 */
export class SupabaseSearchAdapter implements SearchAdapter {
  async search(query: string, types?: string[]): Promise<SearchResult[]> {
    const sb = getSupabase()

    // Get current team from user metadata
    const { data: { session } } = await sb.auth.getSession()
    const teamId = session?.user?.user_metadata?.current_team_id

    if (!teamId) return []

    const { data, error } = await sb.rpc('global_search', {
      p_team_id: teamId,
      p_query: query,
      p_limit: 20,
    })
    if (error) throw new Error(error.message)

    let results = (data || []).map((row: Record<string, unknown>) => ({
      type: row.entity_type as SearchResult['type'],
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | undefined,
      matchField: 'title',
    }))

    // Filter by types if specified
    if (types && types.length > 0) {
      results = results.filter((r: SearchResult) => types.includes(r.type))
    }

    return results
  }
}
