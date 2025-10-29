import { NextRequest } from 'next/server'
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/lib/supabase/server'

export type UserRole = 'interviewer' | 'interviewee'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  name?: string | null
  phone?: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Prefer Authorization: Bearer <access_token> if present
    const authHeader = req.headers.get('Authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (bearer) {
      const admin = getSupabaseAdminClient()
      const { data, error } = await admin.auth.getUser(bearer)
      if (error || !data?.user) return null

      const u = data.user
      return {
        id: u.id,
        email: u.email || '',
        role: (u.user_metadata?.role as UserRole) || 'interviewee',
        name: (u.user_metadata?.name as string | undefined) ?? null,
        phone: (u.user_metadata?.phone as string | undefined) ?? null,
        createdAt: new Date(u.created_at),
        updatedAt: new Date((u as any).updated_at || u.last_sign_in_at || u.created_at)
      }
    }

    // Fallback to cookie-based auth via Supabase SSR client
    try {
      const supabase = getSupabaseServerClient()
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) return null
      const u = data.user
      return {
        id: u.id,
        email: u.email || '',
        role: (u.user_metadata?.role as UserRole) || 'interviewee',
        name: (u.user_metadata?.name as string | undefined) ?? null,
        phone: (u.user_metadata?.phone as string | undefined) ?? null,
        createdAt: new Date(u.created_at),
        updatedAt: new Date((u as any).updated_at || u.last_sign_in_at || u.created_at)
      }
    } catch {
      return null
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return null
  }
}

export function requireAuth(allowedRoles?: UserRole[]) {
  return async (req: NextRequest) => {
    const user = await getAuthenticatedUser(req)
    
    if (!user) {
      return {
        error: 'Authentication required',
        status: 401
      }
    }
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return {
        error: 'Insufficient permissions',
        status: 403
      }
    }
    
    return { user }
  }
}

// Middleware helper for role-based access
export const requireInterviewer = requireAuth(['interviewer'])
export const requireInterviewee = requireAuth(['interviewee'])
export const requireAnyRole = requireAuth(['interviewer', 'interviewee'])