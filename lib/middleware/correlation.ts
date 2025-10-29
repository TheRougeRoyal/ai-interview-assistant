/**
 * Correlation ID middleware for Next.js API routes
 * Automatically adds correlation tracking to all API requests
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createCorrelationContext,
  extractCorrelationId,
  withCorrelationContextAsync,
  getCorrelationId
} from '@/lib/errors/correlation'

/**
 * Middleware to add correlation ID tracking to API routes
 */
export function withCorrelationMiddleware<T extends (...args: any[]) => any>(
  handler: T
): T {
  return (async (req: NextRequest, ...rest: any[]) => {
    // Extract correlation ID from request headers or generate new one
    const existingCorrelationId = extractCorrelationId(
      Object.fromEntries(req.headers.entries()),
      Object.fromEntries(new URL(req.url).searchParams.entries())
    )
    
    // Extract user and session info if available
    const userId = (req as any).user?.id
    const sessionId = (req as any).sessionId
    
    // Create correlation context
    const context = createCorrelationContext(
      existingCorrelationId,
      undefined, // Request ID will be auto-generated
      userId,
      sessionId,
      {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')
      }
    )
    
    // Run handler with correlation context
    const result = await withCorrelationContextAsync(context, () => 
      handler(req, ...rest)
    )
    
    // Add correlation ID to response headers if it's a Response object
    if (result instanceof Response) {
      const correlationId = getCorrelationId()
      result.headers.set('X-Correlation-ID', correlationId)
      result.headers.set('X-Request-ID', context.requestId || '')
    }
    
    return result
  }) as T
}

/**
 * Enhanced API route wrapper with correlation tracking and error handling
 */
export function createApiHandler<T extends (...args: any[]) => any>(
  handler: T
): T {
  return withCorrelationMiddleware(handler)
}

/**
 * Middleware function for Next.js middleware.ts file
 */
export function correlationMiddleware(request: NextRequest) {
  // Extract or generate correlation ID
  const correlationId = extractCorrelationId(
    Object.fromEntries(request.headers.entries()),
    Object.fromEntries(request.nextUrl.searchParams.entries())
  ) || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Create response with correlation headers
  const response = NextResponse.next()
  response.headers.set('X-Correlation-ID', correlationId)
  
  return response
}