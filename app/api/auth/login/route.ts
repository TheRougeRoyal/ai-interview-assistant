import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createUserSession, getUserByEmail } from '@/lib/db/repositories/authRepo'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'auth:login')
    
    let body: unknown
    try { 
      body = await req.json() 
      console.log('[LOGIN] Received body:', body)
    } catch (parseError) {
      console.error('[LOGIN] JSON parse error:', parseError)
      return handleApiError({ 
        code: 'BAD_JSON', 
        message: 'Invalid JSON body' 
      }) 
    }
    
    // Parse and validate request body
    let parsed
    try {
      parsed = LoginSchema.parse(body)
      console.log('[LOGIN] Validation passed:', { email: parsed.email })
    } catch (validationError) {
      // Explicitly handle Zod validation errors
      console.error('[LOGIN] Validation error:', validationError)
      return handleApiError(validationError)
    }
    
    // Find user by email
    let user
    try {
      console.log('[LOGIN] Calling getUserByEmail for:', parsed.email)
      user = await getUserByEmail(parsed.email)
      console.log('[LOGIN] getUserByEmail returned:', user ? 'user found' : 'null')
    } catch (dbError) {
      console.error('[LOGIN] Database error in getUserByEmail:', dbError)
      throw dbError
    }
    
    if (!user) {
      console.log('[LOGIN] User not found:', parsed.email)
      return json(401, { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid email or password' 
        } 
      })
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(parsed.password, user.password)
    console.log('[LOGIN] Password validation:', { isValid: isValidPassword })
    if (!isValidPassword) {
      console.log('[LOGIN] Invalid password for user:', parsed.email)
      return json(401, { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid email or password' 
        } 
      })
    }
    
    console.log('[LOGIN] Login successful for:', user.email)
    
    // Create session
    const session = await createUserSession(user.id)
    
    // Return user data (without password) and session token
    const { password: _, ...userWithoutPassword } = user
    
    const response = json(200, {
      user: userWithoutPassword,
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
    console.error('[LOGIN] Error caught:', err)
    console.error('[LOGIN] Error type:', err instanceof Error ? err.constructor.name : typeof err)
    console.error('[LOGIN] Error message:', err instanceof Error ? err.message : String(err))
    return handleApiError(err)
  }
}