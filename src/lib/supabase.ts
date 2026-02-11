import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// Next.js 14 patches global fetch to cache by default on the server.
// Supabase JS client uses fetch internally, so all queries get cached
// and return stale data. This custom fetch wrapper disables that cache.
const fetchWithNoCache: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithNoCache },
    })
  }
  return _supabase
}

/**
 * Server-side Supabase client using service role key.
 * Bypasses RLS — use only in API routes, never expose to client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      global: { fetch: fetchWithNoCache },
    })
  }
  return _supabaseAdmin
}

/** @deprecated Use getSupabase() instead */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  },
})
