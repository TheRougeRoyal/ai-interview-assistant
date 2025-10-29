import { normalizeError } from '@/lib/errors/handlers'
import { getCorrelationId } from '@/lib/errors/correlation'
import type { ApiError } from '@/lib/errors/types'

/** Create a JSON response with status code and body */
export function json(status: number, body: unknown): Response {
  const correlationId = getCorrelationId()
  
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
  })
}

/** Handle API errors with proper status codes and normalized error format */
export function handleApiError(e: unknown): Response {
  const correlationId = getCorrelationId()
  const error = normalizeError(e, correlationId)
  
  const status = error.statusCode || 500
  
  return json(status, {
    error: {
      code: error.code,
      message: error.message,
      correlationId: error.correlationId,
      timestamp: error.timestamp,
      ...(error.details && { details: error.details })
    },
  })
}

/** Create a success response with correlation ID */
export function success(data: unknown, status: number = 200): Response {
  return json(status, data)
}

/** Create an error response from ApiError */
export function errorResponse(error: ApiError): Response {
  return json(error.statusCode || 500, {
    error: {
      code: error.code,
      message: error.message,
      correlationId: error.correlationId,
      timestamp: error.timestamp,
      ...(error.details && { details: error.details })
    }
  })
}

/** Legacy compatibility - will be deprecated */
export { normalizeError as legacyNormalizeError } from '@/lib/ai/gateway'
