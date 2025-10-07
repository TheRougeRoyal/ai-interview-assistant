import { cookies } from 'next/headers'
import { getUserBySessionToken, UserRole } from '@/lib/db/repositories/authRepo'

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
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return null
    }
    
    const user = await getUserBySessionToken(token)
    return user as AuthenticatedUser | null
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