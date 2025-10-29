/**
 * Enhanced API middleware stack with comprehensive request processing
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createCorrelationContext,
  withCorrelationContextAsync,
  extractCorrelationId,
  getCorrelationId
} from '@/lib/errors/correlation'
import {
  normalizeError,
  handleApiError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  ValidationError,
  ErrorCodes
} from '@/lib/errors'
import {
  withApiLogging,
  logSecurityEvent,
  logAuthEvent
} from '@/lib/logging'
import { rateLimit } from '@/lib/http/rateLimit'

/**
 * Middleware configuration options
 */
export interface MiddlewareConfig {
  // Authentication
  requireAuth?: boolean
  requireRole?: string | string[]
  
  // Rate limiting
  rateLimit?: {
    key: string
    enabled?: boolean
  }
  
  // Validation
  validation?: {
    body?: z.ZodSchema
    query?: z.ZodSchema
    params?: z.ZodSchema
  }
  
  // Logging
  logging?: {
    enabled?: boolean
    logRequest?: boolean
    logResponse?: boolean
    logPerformance?: boolean
    logHeaders?: boolean
    logBody?: boolean
  }
  
  // CORS
  cors?: {
    enabled?: boolean
    origins?: string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
  }
  
  // Security
  security?: {
    enableCSP?: boolean
    enableXSSProtection?: boolean
    enableFrameOptions?: boolean
    enableContentTypeOptions?: boolean
  }
}

/**
 * Default middleware configuration
 */
const DEFAULT_CONFIG: MiddlewareConfig = {
  requireAuth: false,
  rateLimit: {
    key: 'default',
    enabled: true
  },
  logging: {
    enabled: true,
    logRequest: true,
    logResponse: true,
    logPerformance: true,
    logHeaders: false,
    logBody: false
  },
  cors: {
    enabled: true,
    origins: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    credentials: false
  },
  security: {
    enableCSP: true,
    enableXSSProtection: true,
    enableFrameOptions: true,
    enableContentTypeOptions: true
  }
}

/**
 * Request context interface
 */
export interface RequestContext {
  correlationId: string
  requestId: string
  user?: {
    id: string
    email: string
    role: string
  }
  sessionId?: string
  startTime: number
  metadata: Record<string, any>
}

/**
 * Enhanced middleware handler type
 */
export type MiddlewareHandler<T = any> = (
  req: NextRequest,
  context: RequestContext,
  ...args: any[]
) => Promise<T> | T

/**
 * Authentication middleware
 */
async function authenticationMiddleware(
  req: NextRequest,
  config: MiddlewareConfig
): Promise<RequestContext['user']> {
  if (!config.requireAuth) {
    return undefined
  }

  try {
    // Try server-side authentication first
    const { requireInterviewer: requireInterviewerServer } = await import('@/lib/auth/server')
    const user = await requireInterviewerServer()
    
    logAuthEvent('permission_check', true, {
      userId: user?.id,
      email: user?.email,
      role: user?.role,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined
    })
    
    return user
  } catch (cookieErr) {
    try {
      // Fallback to header-based authentication
      const { requireInterviewer: requireInterviewerHeader } = await import('@/lib/auth/middleware')
      const headerAuth = await requireInterviewerHeader(req)
      
      if ((headerAuth as any).error) {
        logAuthEvent('permission_check', false, {
          reason: (headerAuth as any).error,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        })
        
        throw new AuthenticationError(
          ErrorCodes.UNAUTHORIZED,
          (headerAuth as any).error
        )
      }
      
      return headerAuth as any
    } catch (bearerErr: any) {
      const msg = (bearerErr as any)?.message || (cookieErr as any)?.message || 'Authentication required'
      
      logAuthEvent('permission_check', false, {
        reason: msg,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined
      })
      
      if (String(msg).includes('Insufficient')) {
        throw new AuthorizationError('Insufficient permissions')
      } else {
        throw new AuthenticationError(ErrorCodes.UNAUTHORIZED, msg)
      }
    }
  }
}

/**
 * Authorization middleware
 */
async function authorizationMiddleware(
  user: RequestContext['user'],
  config: MiddlewareConfig
): Promise<void> {
  if (!config.requireRole || !user) {
    return
  }

  const requiredRoles = Array.isArray(config.requireRole) ? config.requireRole : [config.requireRole]
  
  if (!requiredRoles.includes(user.role)) {
    logSecurityEvent(
      'unauthorized_access',
      'medium',
      {
        userId: user.id,
        userRole: user.role,
        requiredRoles,
        reason: 'insufficient_role'
      },
      { userId: user.id }
    )
    
    throw new AuthorizationError(`Required role: ${requiredRoles.join(' or ')}`)
  }
}

/**
 * Rate limiting middleware
 */
async function rateLimitMiddleware(
  req: NextRequest,
  config: MiddlewareConfig
): Promise<void> {
  if (!config.rateLimit?.enabled) {
    return
  }

  try {
    await rateLimit(req, config.rateLimit.key)
  } catch (error: any) {
    // Log rate limit exceeded event
    logSecurityEvent(
      'rate_limit_exceeded',
      'low',
      {
        key: config.rateLimit.key,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      },
      {
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        userAgent: req.headers.get('user-agent') || undefined
      }
    )
    
    throw new RateLimitError(60) // 60 seconds retry after
  }
}

/**
 * Request validation middleware
 */
async function validationMiddleware(
  req: NextRequest,
  config: MiddlewareConfig
): Promise<{
  body?: any
  query?: any
  params?: any
}> {
  const result: any = {}

  // Validate query parameters
  if (config.validation?.query) {
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    try {
      result.query = config.validation.query.parse(queryParams)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Query validation failed', {
          query: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }
      throw error
    }
  }

  // Validate request body
  if (config.validation?.body && req.method !== 'GET') {
    try {
      const body = await req.json()
      result.body = config.validation.body.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Body validation failed', {
          body: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      } else if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid JSON body', {
          body: ['Request body must be valid JSON']
        })
      }
      throw error
    }
  }

  return result
}

/**
 * CORS middleware
 */
function corsMiddleware(
  req: NextRequest,
  config: MiddlewareConfig
): Record<string, string> {
  if (!config.cors?.enabled) {
    return {}
  }

  const headers: Record<string, string> = {}
  const origin = req.headers.get('origin')

  // Handle origins
  if (config.cors.origins?.includes('*') || (origin && config.cors.origins?.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin || '*'
  }

  // Handle methods
  if (config.cors.methods) {
    headers['Access-Control-Allow-Methods'] = config.cors.methods.join(', ')
  }

  // Handle headers
  if (config.cors.headers) {
    headers['Access-Control-Allow-Headers'] = config.cors.headers.join(', ')
  }

  // Handle credentials
  if (config.cors.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Security headers middleware
 */
function securityHeadersMiddleware(
  config: MiddlewareConfig
): Record<string, string> {
  const headers: Record<string, string> = {}

  if (config.security?.enableCSP) {
    headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  }

  if (config.security?.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block'
  }

  if (config.security?.enableFrameOptions) {
    headers['X-Frame-Options'] = 'DENY'
  }

  if (config.security?.enableContentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff'
  }

  return headers
}

/**
 * Create enhanced middleware stack
 */
export function createMiddlewareStack<T extends (...args: any[]) => any>(
  handler: MiddlewareHandler<ReturnType<T>>,
  config: Partial<MiddlewareConfig> = {}
): T {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  return (async (req: NextRequest, ...rest: any[]) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      const corsHeaders = corsMiddleware(req, fullConfig)
      return new NextResponse(null, { status: 200, headers: corsHeaders })
    }

    // Extract correlation ID
    const existingCorrelationId = extractCorrelationId(
      Object.fromEntries(req.headers.entries()),
      Object.fromEntries(new URL(req.url).searchParams.entries())
    )

    // Create correlation context
    const correlationContext = createCorrelationContext(
      existingCorrelationId,
      undefined,
      undefined,
      undefined,
      {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      }
    )

    return withCorrelationContextAsync(correlationContext, async () => {
      try {
        // Rate limiting
        await rateLimitMiddleware(req, fullConfig)

        // Authentication
        const user = await authenticationMiddleware(req, fullConfig)

        // Authorization
        await authorizationMiddleware(user, fullConfig)

        // Validation
        const validatedData = await validationMiddleware(req, fullConfig)

        // Create request context
        const context: RequestContext = {
          correlationId: getCorrelationId(),
          requestId: correlationContext.requestId || '',
          user,
          sessionId: correlationContext.sessionId,
          startTime: correlationContext.startTime,
          metadata: {
            ...correlationContext.metadata,
            ...validatedData
          }
        }

        // Execute handler with logging if enabled
        let result: any
        if (fullConfig.logging?.enabled) {
          const loggedHandler = withApiLogging(
            (req: NextRequest) => handler(req, context, ...rest),
            fullConfig.logging
          )
          result = await loggedHandler(req)
        } else {
          result = await handler(req, context, ...rest)
        }

        // Add response headers
        if (result instanceof Response) {
          const corsHeaders = corsMiddleware(req, fullConfig)
          const securityHeaders = securityHeadersMiddleware(fullConfig)
          const correlationHeaders = {
            'X-Correlation-ID': context.correlationId,
            'X-Request-ID': context.requestId
          }

          // Merge all headers
          const allHeaders = { ...corsHeaders, ...securityHeaders, ...correlationHeaders }
          Object.entries(allHeaders).forEach(([key, value]) => {
            result.headers.set(key, value)
          })
        }

        return result
      } catch (error) {
        return handleApiError(error)
      }
    })
  }) as T
}

/**
 * Convenience function for API routes
 */
export function withMiddleware<T extends (...args: any[]) => any>(
  handler: MiddlewareHandler<ReturnType<T>>,
  config?: Partial<MiddlewareConfig>
): T {
  return createMiddlewareStack(handler, config)
}

/**
 * Predefined middleware configurations
 */
export const MiddlewarePresets = {
  /**
   * Public API endpoint (no auth required)
   */
  public: (config?: Partial<MiddlewareConfig>): Partial<MiddlewareConfig> => ({
    requireAuth: false,
    rateLimit: { key: 'public', enabled: true },
    ...config
  }),

  /**
   * Protected API endpoint (auth required)
   */
  protected: (config?: Partial<MiddlewareConfig>): Partial<MiddlewareConfig> => ({
    requireAuth: true,
    rateLimit: { key: 'protected', enabled: true },
    ...config
  }),

  /**
   * Admin-only API endpoint
   */
  admin: (config?: Partial<MiddlewareConfig>): Partial<MiddlewareConfig> => ({
    requireAuth: true,
    requireRole: 'admin',
    rateLimit: { key: 'admin', enabled: true },
    ...config
  }),

  /**
   * Interviewer-only API endpoint
   */
  interviewer: (config?: Partial<MiddlewareConfig>): Partial<MiddlewareConfig> => ({
    requireAuth: true,
    requireRole: 'interviewer',
    rateLimit: { key: 'interviewer', enabled: true },
    ...config
  })
}