"use client"

import { createBrowserClient } from '@supabase/ssr'

// Singleton browser client for use in client-side code (components, Redux thunks)
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}

export type SupabaseBrowserClient = ReturnType<typeof getSupabaseBrowserClient>
