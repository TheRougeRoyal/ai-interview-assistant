/**
 * Authentication API Routes
 * Handles login, token refresh, and logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { generateTokenPair, verifyRefreshToken } from '@/lib/auth/jwt';
import {
  createSession,
  deleteSession,
  getSessionByRefreshToken,
  updateSessionTokens,
  enforceSessionLimit,
} from '@/lib/auth/session-manager';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
export async function POST(req: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);
    
    // Authenticate with Supabase
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error || !data.user) {
      console.warn('Login failed:', email);
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const user = data.user;
    const role = (user.user_metadata?.role as 'interviewer' | 'interviewee') || 'interviewee';
    
    // Generate JWT tokens
    const tokens = await generateTokenPair(user.id, user.email!, role);
    
    // Get request metadata
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    
    // Create session
    await createSession({
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      ipAddress,
      userAgent,
    });
    
    // Enforce session limit (max 5 concurrent sessions)
    await enforceSessionLimit(user.id, 5);
    
    console.log('User logged in:', { userId: user.id, email: user.email, role });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role,
        name: user.user_metadata?.name,
        phone: user.user_metadata?.phone,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
