import { NextRequest } from 'next/server'
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

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get token from cookie or Authorization header
    const authHeader = req.headers.get('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    // For server-side components, we'll also check cookies via middleware
    const token = tokenFromHeader
    
    if (!token) {
      return null
    }
    
    // Get user by session token
    const user = await getUserBySessionToken(token)
    return user as AuthenticatedUser | null
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