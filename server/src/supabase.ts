import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Server-side Supabase client using service_role key (bypasses RLS).
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }

    supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return supabase
}
