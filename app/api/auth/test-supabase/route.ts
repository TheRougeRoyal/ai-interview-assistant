import { NextRequest } from 'next/server'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  try {
    // Test if env vars are properly set
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !anonKey) {
      return Response.json({
        success: false,
        error: 'Supabase environment variables not set',
        hasUrl: !!url,
        hasAnonKey: !!anonKey
      }, { status: 500 })
    }

    return Response.json({
      success: true,
      message: 'Supabase connection configured',
      url: url,
      anonKeyPrefix: anonKey.substring(0, 20) + '...'
    })
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
