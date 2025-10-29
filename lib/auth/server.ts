import { cookies } from 'next/headers'
import { getSupabaseServerClient } from '@/lib/supabase/server'

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

/**
 * Get the currently authenticated user from server components or API routes
 * This function reads the session token from cookies
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    // Use Supabase SSR client to read the session from cookies
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) return null

    const u = data.user
    const role = (u.user_metadata?.role as UserRole) || 'interviewee'
    const name = (u.user_metadata?.name as string | undefined) ?? null
    const phone = (u.user_metadata?.phone as string | undefined) ?? null
    const createdAt = new Date(u.created_at)
    const updatedAt = new Date((u as any).updated_at || u.last_sign_in_at || u.created_at)

    return {
      id: u.id,
      email: u.email || '',
      role,
      name,
      phone,
      createdAt,
      updatedAt,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Require authentication for server components or API routes
 * Throws an error if user is not authenticated
 */
export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

/**
 * Require specific role for server components or API routes
 * Throws an error if user doesn't have the required role
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireCurrentUser()
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  
  return user
}

/**
 * Require interviewer role
 */
export async function requireInterviewer(): Promise<AuthenticatedUser> {
  return requireRole(['interviewer'])
}

/**
 * Require interviewee role
 */
export async function requireInterviewee(): Promise<AuthenticatedUser> {
  return requireRole(['interviewee'])
}