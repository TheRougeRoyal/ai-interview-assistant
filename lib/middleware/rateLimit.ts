/**
 * Enhanced rate limiting middleware with configurable limits and storage backends
 */

import { NextRequest } from 'next/server'
import { RateLimitError } from '@/lib/errors'
import { getSecurityLogger } from '@/lib/logging'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string | Promise<string>
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
  headers?: boolean       // Include rate limit headers in response
  store?: RateLimitStore  // Custom storage backend
}

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>
  set(key: string, data: RateLimitData, ttl: number): Promise<void>
  increment(key: string, ttl: number): Promise<RateLimitData>
  reset(key: string): Promise<void>
}

/**
 * Rate limit data structure
 */
export interface RateLimitData {
  count: number
  resetTime: number
  firstRequest: number
}

/**
 * In-memory rate limit store
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitData>()
  private timers = new Map<string, NodeJS.Timeout>()

  async get(key: string): Promise<RateLimitData | null> {
    return this.store.get(key) || null
  }

  async set(key: string, data: RateLimitData, ttl: number): Promise<void> {
    this.store.set(key, data)
    this.setExpiration(key, ttl)
  }

  async increment(key: string, ttl: number): Promise<RateLimitData> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetTime) {
      // Create new window
      const data: RateLimitData = {
        count: 1,
        resetTime: now + ttl,
        firstRequest: now
      }
      this.store.set(key, data)
      this.setExpiration(key, ttl)
      return data
    } else {
      // Increment existing window
      existing.count++
      return existing
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  private setExpiration(key: string, ttl: number): void {
    const existingTimer = this.timers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.store.delete(key)
      this.timers.delete(key)
    }, ttl)

    this.timers.set(key, timer)
  }
}

/**
 * Default key generator based on IP address
 */
async function defaultKeyGenerator(req: NextRequest): Promise<string> {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  
  const ip = forwardedFor?.split(',')[0].trim() || realIp || cfConnectingIp || 'unknown'
  return `rate_limit:${ip}`
}

/**
 * User-based key generator
 */
export function userKeyGenerator(req: NextRequest): string {
  const userId = (req as any).user?.id
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
            req.headers.get('x-real-ip') || 
            'unknown'
  
  return userId ? `rate_limit:user:${userId}` : `rate_limit:ip:${ip}`
}

/**
 * Route-based key generator
 */
export function routeKeyGenerator(route: string) {
  return (req: NextRequest): string => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
              req.headers.get('x-real-ip') || 
              'unknown'
    return `rate_limit:${route}:${ip}`
  }
}

/**
 * Global rate limit store instance
 */
const globalStore = new MemoryRateLimitStore()

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict rate limiting for authentication endpoints
   */
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    headers: true
  } as RateLimitConfig,

  /**
   * Standard rate limiting for API endpoints
   */
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please try again in a minute.',
    headers: true
  } as RateLimitConfig,

  /**
   * Lenient rate limiting for public endpoints
   */
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    message: 'Too many requests. Please try again in a minute.',
    headers: true
  } as RateLimitConfig,

  /**
   * Strict rate limiting for file uploads
   */
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Too many file uploads. Please try again in a minute.',
    headers: true
  } as RateLimitConfig,

  /**
   * Very strict rate limiting for password reset
   */
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts. Please try again in an hour.',
    headers: true
  } as RateLimitConfig
}

/**
 * Enhanced rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests',
    headers = true,
    store = globalStore
  } = config

  return async (req: NextRequest): Promise<void> => {
    const logger = getSecurityLogger()
    
    try {
      // Generate rate limit key
      const key = await keyGenerator(req)
      
      // Get or increment counter
      const data = await store.increment(key, windowMs)
      
      // Check if limit exceeded
      if (data.count > maxRequests) {
        const retryAfter = Math.ceil((data.resetTime - Date.now()) / 1000)
        
        // Log rate limit exceeded
        logger.logSecurity({
          category: 'security' as any,
          message: 'Rate limit exceeded',
          security: {
            event: 'rate_limit_exceeded',
            severity: 'low' as any,
            details: {
              key,
              count: data.count,
              maxRequests,
              windowMs,
              retryAfter,
              ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
              userAgent: req.headers.get('user-agent') || 'unknown',
              url: req.url,
              method: req.method
            },
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
            userAgent: req.headers.get('user-agent') || undefined
          }
        })
        
        throw new RateLimitError(retryAfter)
      }
      
      // Log successful rate limit check (debug level)
      logger.debug('Rate limit check passed', {
        key,
        count: data.count,
        maxRequests,
        remaining: maxRequests - data.count
      })
      
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error
      }
      
      // Log rate limit check error
      logger.error('Rate limit check failed', error instanceof Error ? error : new Error(String(error)), {
        url: req.url,
        method: req.method
      })
      
      // Don't block request if rate limiting fails
      logger.warn('Rate limiting disabled due to error - allowing request')
    }
  }
}

/**
 * Convenience functions for common rate limiting scenarios
 */
export const rateLimit = {
  /**
   * Authentication endpoints
   */
  auth: createRateLimit(RateLimitPresets.auth),
  
  /**
   * Standard API endpoints
   */
  api: createRateLimit(RateLimitPresets.api),
  
  /**
   * Public endpoints
   */
  public: createRateLimit(RateLimitPresets.public),
  
  /**
   * File upload endpoints
   */
  upload: createRateLimit(RateLimitPresets.upload),
  
  /**
   * Password reset endpoints
   */
  passwordReset: createRateLimit(RateLimitPresets.passwordReset),
  
  /**
   * Custom rate limiting
   */
  custom: createRateLimit
}

/**
 * Rate limit headers utility
 */
export function getRateLimitHeaders(data: RateLimitData, maxRequests: number): Record<string, string> {
  const remaining = Math.max(0, maxRequests - data.count)
  const resetTime = Math.ceil(data.resetTime / 1000)
  
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Used': data.count.toString()
  }
}