import { NextRequest } from 'next/server'
import { handleApiError, json } from '@/lib/http/errors'
import { getUserBySessionToken } from '@/lib/db/repositories/authRepo'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const cookieStore = await cookies()
    const tokenFromCookie = cookieStore.get('auth-token')?.value
    const authHeader = req.headers.get('Authorization')
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    const token = tokenFromCookie || tokenFromHeader
    
    if (!token) {
      return json(401, { 
        error: { 
          code: 'NO_TOKEN', 
          message: 'No session token provided' 
        } 
      })
    }
    
    // Get user by session token
    const user = await getUserBySessionToken(token)
    if (!user) {
      return json(401, { 
        error: { 
          code: 'INVALID_TOKEN', 
          message: 'Invalid or expired session token' 
        } 
      })
    }
    
    return json(200, { user })
  } catch (err) {
    return handleApiError(err)
  }
}