import { NextRequest } from 'next/server'
import { handleApiError, json } from '@/lib/http/errors'
import { deleteUserSession } from '@/lib/db/repositories/authRepo'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieStore = await cookies()
    const tokenFromCookie = cookieStore.get('auth-token')?.value
    const authHeader = req.headers.get('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    const token = tokenFromCookie || tokenFromHeader
    
    if (!token) {
      return json(400, { 
        error: { 
          code: 'NO_TOKEN', 
          message: 'No session token provided' 
        } 
      })
    }
    
    // Delete session from database
    try {
      await deleteUserSession(token)
    } catch (error) {
      // Session might not exist, which is fine for logout
      console.warn('Session deletion failed:', error)
    }
    
    // Clear the cookie. Omit Secure in development so the cookie is cleared locally.
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    const response = json(200, { message: 'Logged out successfully' })
    response.headers.set('Set-Cookie', 
      `auth-token=; HttpOnly; ${secureFlag} SameSite=strict; Path=/; Max-Age=0`
    )
    
    return response
  } catch (err) {
    return handleApiError(err)
  }
}