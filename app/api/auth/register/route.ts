import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { z } from 'zod'
import { createUser, getUserByEmail, createUserSession, UserRole } from '@/lib/db/repositories/authRepo'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['interviewer', 'interviewee'] as const),
  name: z.string().optional(),
  phone: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'auth:register')
    
    let body: unknown
    try { 
      body = await req.json() 
    } catch { 
      return handleApiError({ 
        code: 'BAD_JSON', 
        message: 'Invalid JSON body' 
      }) 
    }
    
    const parsed = RegisterSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await getUserByEmail(parsed.email)
    if (existingUser) {
      return json(409, { 
        error: { 
          code: 'CONFLICT', 
          message: 'User with this email already exists' 
        } 
      })
    }
    
    // Create user
    const user = await createUser({
      email: parsed.email,
      password: parsed.password,
      role: parsed.role as UserRole,
      name: parsed.name,
      phone: parsed.phone
    })
    
    // Create session
    const session = await createUserSession(user.id)
    
    // Return user data and session token
    const response = json(201, {
      user,
      token: session.token,
      expiresAt: session.expiresAt.toISOString()
    })
    
    // Set HTTP-only cookie for token. Omit Secure in development to allow localhost HTTP testing.
    const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    response.headers.set('Set-Cookie', 
      `auth-token=${session.token}; HttpOnly; ${secureFlag} SameSite=strict; Path=/; Max-Age=${7 * 24 * 60 * 60}` // 7 days
    )
    
    return response
  } catch (err) {
    return handleApiError(err)
  }
}