/**
 * Server-side Supabase clients. Never import from a client component.
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/** Bypasses RLS. Ingestion and admin only — never expose to the browser. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

/** True when the app has enough configuration to read from the database. */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
}

/** Respects RLS. Safe for reads rendered to a public page. */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase public env vars are required')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}
