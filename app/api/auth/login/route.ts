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
    } catch { 
      return handleApiError({ 
        code: 'BAD_JSON', 
        message: 'Invalid JSON body' 
      }) 
    }
    
    const parsed = LoginSchema.parse(body)
    
    // Find user by email
    const user = await getUserByEmail(parsed.email)
    if (!user) {
      return json(401, { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid email or password' 
        } 
      })
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(parsed.password, user.password)
    if (!isValidPassword) {
      return json(401, { 
        error: { 
          code: 'UNAUTHORIZED', 
          message: 'Invalid email or password' 
        } 
      })
    }
    
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
    return handleApiError(err)
  }
}