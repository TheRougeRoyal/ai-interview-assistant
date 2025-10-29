import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient, SupabaseClient } from '@supabase/supabase-js'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var ${name}`)
  return v
}

export async function getSupabaseServerClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      get: (name: string) => {
        return cookieStore.get(name)?.value
      },
      set: (name: string, value: string, options: any) => {
        try {
          cookieStore.set(name, value, options)
        } catch {
          // Silently fail if we can't set cookies (e.g., in server components)
        }
      },
      remove: (name: string, options: any) => {
        try {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        } catch {
          // Silently fail if we can't remove cookies
        }
      }
    }
  })
}

export function getSupabaseAdminClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createAdminClient(url, serviceRole)
}
