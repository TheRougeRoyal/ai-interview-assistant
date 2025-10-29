/**
 * Enhanced Rate Limiting
 * Implements rate limiting per user and per IP address
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Get client identifier (IP address)
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  const cloudflare = req.headers.get('cf-connecting-ip');
  
  if (cloudflare) return cloudflare;
  if (real) return real;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Get user identifier from request
 */
export function getUserId(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // Extract user ID from token (simplified - in reality, decode JWT)
  try {
    const token = authHeader.substring(7);
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Default key generator (combines IP and user ID)
 */
function defaultKeyGenerator(req: NextRequest): string {
  const ip = getClientIP(req);
  const userId = getUserId(req);
  return userId ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const key = keyGenerator(req);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment count
  entry.count++;
  
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetTime = entry.resetTime;
  const retryAfter = allowed ? undefined : Math.ceil((resetTime - now) / 1000);
  
  return {
    allowed,
    remaining,
    resetTime,
    retryAfter,
  };
}

/**
 * Rate limit middleware wrapper
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: NextRequest): NextResponse | null => {
    const result = checkRateLimit(req, config);
    
    if (!result.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          retryAfter: result.retryAfter,
        },
        { status: 429 }
      );
      
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      response.headers.set('Retry-After', result.retryAfter!.toString());
      
      return response;
    }
    
    return null; // Allow request to proceed
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  return response;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // Authentication endpoints: 5 requests per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },
  
  // API endpoints: 60 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  
  // File upload: 5 uploads per minute
  fileUpload: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  
  // AI generation: 10 requests per minute
  aiGeneration: {
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  
  // Strict rate limit for sensitive operations
  strict: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
};

/**
 * Rate limit by IP only
 */
export function rateLimitByIP(config: RateLimitConfig) {
  return rateLimit({
    ...config,
    keyGenerator: (req) => `ip:${getClientIP(req)}`,
  });
}

/**
 * Rate limit by user only
 */
export function rateLimitByUser(config: RateLimitConfig) {
  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      const userId = getUserId(req);
      return userId ? `user:${userId}` : `ip:${getClientIP(req)}`;
    },
  });
}

/**
 * Separate rate limits for authenticated and anonymous users
 */
export function rateLimitWithTiers(
  authenticatedConfig: RateLimitConfig,
  anonymousConfig: RateLimitConfig
) {
  return (req: NextRequest): NextResponse | null => {
    const userId = getUserId(req);
    const config = userId ? authenticatedConfig : anonymousConfig;
    
    return rateLimit(config)(req);
  };
}
