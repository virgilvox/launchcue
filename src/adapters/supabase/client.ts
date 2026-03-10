import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | null = null

/**
 * Get the Supabase client instance.
 * Works with both self-hosted (Docker) and Supabase Cloud — just change env vars.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables')
    }

    supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabase
}

/**
 * Reset the client (for testing or logout).
 */
export function resetSupabase(): void {
  supabase = null
}
