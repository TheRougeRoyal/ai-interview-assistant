/**
 * Logging middleware for Next.js API routes and other integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiLogger } from './factory'
import { LogCategory } from './types'
import {
  createCorrelationContext,
  withCorrelationContextAsync,
  getCorrelationId,
  getRequestDuration,
  extractCorrelationId
} from '@/lib/errors/correlation'
import { createTimer } from './performance'

/**
 * API request logging middleware
 */
export function withApiLogging<T extends (...args: any[]) => any>(
  handler: T,
  options: {
    logRequest?: boolean
    logResponse?: boolean
    logPerformance?: boolean
    logHeaders?: boolean
    logBody?: boolean
  } = {}
): T {
  const {
    logRequest = true,
    logResponse = true,
    logPerformance = true,
    logHeaders = false,
    logBody = false
  } = options

  return (async (req: NextRequest, ...rest: any[]) => {
    const logger = getApiLogger()
    const timer = createTimer()
    timer.start()

    // Extract correlation ID from request
    const existingCorrelationId = extractCorrelationId(
      Object.fromEntries(req.headers.entries()),
      Object.fromEntries(new URL(req.url).searchParams.entries())
    )

    // Create correlation context
    const context = createCorrelationContext(
      existingCorrelationId,
      undefined,
      (req as any).user?.id,
      (req as any).sessionId,
      {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined
      }
    )

    return withCorrelationContextAsync(context, async () => {
      const correlationId = getCorrelationId()

      // Log incoming request
      if (logRequest) {
        const requestData: any = {
          method: req.method,
          url: req.url,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
          userAgent: req.headers.get('user-agent') || undefined
        }

        if (logHeaders) {
          requestData.headers = Object.fromEntries(req.headers.entries())
        }

        if (logBody && req.method !== 'GET') {
          try {
            // Clone request to read body without consuming it
            const clonedReq = req.clone()
            requestData.body = await clonedReq.json()
          } catch {
            // Body might not be JSON or might be empty
          }
        }

        logger.logApiRequest({
          category: LogCategory.API,
          message: `${req.method} ${req.url}`,
          correlationId,
          request: requestData,
          performance: {
            duration: 0,
            startTime: timer.getStartTime(),
            endTime: 0
          }
        })
      }

      try {
        // Execute the handler
        const result = await handler(req, ...rest)
        const duration = timer.end()

        // Log response
        if (logResponse && result instanceof Response) {
          const responseData: any = {
            statusCode: result.status,
            size: result.headers.get('content-length') || undefined
          }

          if (logHeaders) {
            responseData.headers = Object.fromEntries(result.headers.entries())
          }

          if (logBody && result.status >= 400) {
            try {
              // Clone response to read body without consuming it
              const clonedResponse = result.clone()
              responseData.body = await clonedResponse.json()
            } catch {
              // Body might not be JSON
            }
          }

          logger.logApiRequest({
            category: LogCategory.API,
            message: `${req.method} ${req.url} - ${result.status}`,
            correlationId,
            request: {
              method: req.method,
              url: req.url,
              ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
              userAgent: req.headers.get('user-agent') || undefined
            },
            response: responseData,
            performance: {
              duration,
              startTime: timer.getStartTime(),
              endTime: timer.getEndTime()
            }
          })
        }

        // Log performance
        if (logPerformance) {
          logger.logPerformance({
            category: LogCategory.PERFORMANCE,
            message: `API ${req.method} ${req.url}`,
            correlationId,
            performance: {
              operation: `${req.method} ${req.url}`,
              duration,
              startTime: timer.getStartTime(),
              endTime: timer.getEndTime()
            }
          })
        }

        return result
      } catch (error) {
        const duration = timer.end()

        // Log error
        logger.error(
          `API ${req.method} ${req.url} failed`,
          error instanceof Error ? error : new Error(String(error)),
          {
            request: {
              method: req.method,
              url: req.url,
              ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
              userAgent: req.headers.get('user-agent') || undefined
            },
            performance: {
              duration,
              startTime: timer.getStartTime(),
              endTime: timer.getEndTime()
            }
          }
        )

        throw error
      }
    })
  }) as T
}

/**
 * Database operation logging middleware
 */
export function withDatabaseLogging<T extends (...args: any[]) => any>(
  handler: T,
  operation: {
    type: 'query' | 'mutation' | 'transaction'
    model?: string
    method?: string
  }
): T {
  return (async (...args: any[]) => {
    const logger = getDatabaseLogger()
    const timer = createTimer()
    const correlationId = getCorrelationId()
    
    timer.start()

    try {
      const result = await handler(...args)
      const duration = timer.end()

      logger.logDatabaseOperation({
        category: LogCategory.DATABASE,
        message: `Database ${operation.type} ${operation.model || ''}.${operation.method || ''}`,
        correlationId,
        operation: {
          ...operation,
          params: args
        },
        performance: {
          duration,
          startTime: timer.getStartTime(),
          endTime: timer.getEndTime()
        }
      })

      return result
    } catch (error) {
      const duration = timer.end()

      logger.error(
        `Database ${operation.type} ${operation.model || ''}.${operation.method || ''} failed`,
        error instanceof Error ? error : new Error(String(error)),
        {
          operation: {
            ...operation,
            params: args
          },
          performance: {
            duration,
            startTime: timer.getStartTime(),
            endTime: timer.getEndTime()
          }
        }
      )

      throw error
    }
  }) as T
}

/**
 * Authentication event logging middleware
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'register' | 'token_refresh' | 'password_reset' | 'permission_check',
  success: boolean,
  details: {
    userId?: string
    email?: string
    role?: string
    reason?: string
    ip?: string
    userAgent?: string
  } = {}
): void {
  const logger = getAuthLogger()
  const correlationId = getCorrelationId()

  logger.logAuthEvent({
    category: LogCategory.AUTH,
    message: `Authentication ${action} ${success ? 'succeeded' : 'failed'}`,
    correlationId,
    auth: {
      action,
      success,
      ...details
    }
  })
}

/**
 * User action logging middleware
 */
export function logUserAction(
  type: string,
  success: boolean,
  details: {
    resource?: string
    resourceId?: string
    userId?: string
    metadata?: Record<string, any>
  } = {}
): void {
  const logger = getUserActionLogger()
  const correlationId = getCorrelationId()

  logger.logUserAction({
    category: LogCategory.USER_ACTION,
    message: `User action ${type} ${success ? 'succeeded' : 'failed'}`,
    correlationId,
    action: {
      type,
      success,
      resource: details.resource,
      resourceId: details.resourceId,
      details: details.metadata
    },
    userId: details.userId
  })
}

/**
 * Security event logging
 */
export function logSecurityEvent(
  event: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt',
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>,
  context: {
    ip?: string
    userAgent?: string
    userId?: string
  } = {}
): void {
  const logger = getSecurityLogger()
  const correlationId = getCorrelationId()

  logger.logSecurity({
    category: LogCategory.SECURITY,
    message: `Security event: ${event}`,
    correlationId,
    security: {
      event,
      severity: severity as any,
      details,
      ip: context.ip,
      userAgent: context.userAgent
    },
    userId: context.userId
  })
}

// Re-export for convenience
import { getDatabaseLogger, getUserActionLogger, getSecurityLogger, getAuthLogger } from './factory'