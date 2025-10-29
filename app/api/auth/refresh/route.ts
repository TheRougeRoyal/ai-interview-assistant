/**
 * Token Refresh API Route
 * POST /api/auth/refresh
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { refreshAccessToken } from '@/lib/auth/jwt';
import {
  getSessionByRefreshToken,
  updateSessionTokens,
} from '@/lib/auth/session-manager';

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = refreshSchema.parse(body);
    
    // Get session by refresh token
    const session = await getSessionByRefreshToken(refreshToken);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }
    
    // Generate new tokens
    const newTokens = await refreshAccessToken(refreshToken);
    
    if (!newTokens) {
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 }
      );
    }
    
    // Update session with new tokens
    await updateSessionTokens(
      session.id,
      newTokens.accessToken,
      newTokens.refreshToken,
      newTokens.expiresIn
    );
    
    console.log('Token refreshed for user:', session.userId);
    
    return NextResponse.json({
      success: true,
      tokens: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
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
