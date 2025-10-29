/**
 * Error handler utilities for different error categories
 * Provides standardized error handling and conversion to API errors
 */

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import {
  ApiError,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalServiceError,
  FileProcessingError,
  RateLimitError,
  ErrorCodes,
  ErrorCategory,
  ErrorSeverity,
  ERROR_STATUS_MAP,
  generateCorrelationId
} from './types'

/**
 * Main error handler interface
 */
export interface ErrorHandler {
  handleValidationError(error: z.ZodError, correlationId?: string): ApiError
  handleDatabaseError(error: Prisma.PrismaClientKnownRequestError | Error, correlationId?: string): ApiError
  handleAuthError(error: Error, correlationId?: string): ApiError
  handleExternalServiceError(error: Error, service: string, correlationId?: string): ApiError
  handleFileProcessingError(error: Error, fileName?: string, correlationId?: string): ApiError
  handleRateLimitError(retryAfter?: number, correlationId?: string): ApiError
  handleGenericError(error: unknown, correlationId?: string): ApiError
}

/**
 * Default error handler implementation
 */
export class DefaultErrorHandler implements ErrorHandler {
  /**
   * Handle Zod validation errors
   */
  handleValidationError(error: z.ZodError, correlationId?: string): ApiError {
    const fieldErrors: Record<string, string[]> = {}
    
    error.errors.forEach((err) => {
      const path = err.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(err.message)
    })

    const validationError = new ValidationError(
      'Validation failed',
      fieldErrors,
      correlationId
    )

    return validationError.toApiError()
  }

  /**
   * Handle Prisma database errors
   */
  handleDatabaseError(error: Prisma.PrismaClientKnownRequestError | Error, correlationId?: string): ApiError {
    let dbError: DatabaseError

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          dbError = new DatabaseError(
            ErrorCodes.DUPLICATE_RECORD,
            'A record with this information already exists',
            error,
            correlationId
          )
          // Override status code for duplicate records
          Object.defineProperty(dbError, 'statusCode', { value: 409, writable: false })
          break
        case 'P2025':
          dbError = new DatabaseError(
            ErrorCodes.RECORD_NOT_FOUND,
            'The requested record was not found',
            error,
            correlationId
          )
          // Override status code for not found records
          Object.defineProperty(dbError, 'statusCode', { value: 404, writable: false })
          break
        case 'P2003':
          dbError = new DatabaseError(
            ErrorCodes.CONSTRAINT_VIOLATION,
            'Foreign key constraint violation',
            error,
            correlationId
          )
          break
        case 'P1001':
        case 'P1002':
          dbError = new DatabaseError(
            ErrorCodes.CONNECTION_FAILED,
            'Database connection failed',
            error,
            correlationId
          )
          break
        default:
          dbError = new DatabaseError(
            ErrorCodes.DATABASE_ERROR,
            'A database error occurred',
            error,
            correlationId
          )
      }
    } else {
      dbError = new DatabaseError(
        ErrorCodes.DATABASE_ERROR,
        'A database error occurred',
        error,
        correlationId
      )
    }

    return dbError.toApiError()
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error: Error, correlationId?: string): ApiError {
    let authError: AuthenticationError

    if (error.message.includes('token')) {
      if (error.message.includes('expired')) {
        authError = new AuthenticationError(
          ErrorCodes.TOKEN_EXPIRED,
          'Authentication token has expired',
          correlationId
        )
      } else {
        authError = new AuthenticationError(
          ErrorCodes.INVALID_TOKEN,
          'Invalid authentication token',
          correlationId
        )
      }
    } else if (error.message.includes('credentials')) {
      authError = new AuthenticationError(
        ErrorCodes.INVALID_CREDENTIALS,
        'Invalid credentials provided',
        correlationId
      )
    } else {
      authError = new AuthenticationError(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        correlationId
      )
    }

    return authError.toApiError()
  }

  /**
   * Handle external service errors
   */
  handleExternalServiceError(error: Error, service: string, correlationId?: string): ApiError {
    const serviceError = new ExternalServiceError(
      service,
      `${service} service error: ${error.message}`,
      error,
      correlationId
    )

    return serviceError.toApiError()
  }

  /**
   * Handle file processing errors
   */
  handleFileProcessingError(error: Error, fileName?: string, correlationId?: string): ApiError {
    let code: typeof ErrorCodes[keyof typeof ErrorCodes] = ErrorCodes.FILE_PROCESSING_FAILED

    if (error.message.includes('too large') || error.message.includes('size')) {
      code = ErrorCodes.FILE_TOO_LARGE
    } else if (error.message.includes('type') || error.message.includes('format')) {
      code = ErrorCodes.INVALID_FILE_TYPE
    } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
      code = ErrorCodes.FILE_CORRUPTED
    }

    const fileError = new FileProcessingError(
      code,
      error.message,
      fileName,
      correlationId
    )

    return fileError.toApiError()
  }

  /**
   * Handle rate limit errors
   */
  handleRateLimitError(retryAfter: number = 60, correlationId?: string): ApiError {
    const rateLimitError = new RateLimitError(retryAfter, correlationId)
    return rateLimitError.toApiError()
  }

  /**
   * Handle generic/unknown errors
   */
  handleGenericError(error: unknown, correlationId?: string): ApiError {
    const cId = correlationId || generateCorrelationId()

    // If it's already an AppError, return its API representation
    if (error instanceof AppError) {
      return error.toApiError()
    }

    // If it's a standard Error
    if (error instanceof Error) {
      const appError = new AppError(
        ErrorCodes.INTERNAL_SERVER_ERROR,
        error.message,
        {
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          retryable: false,
          userMessage: 'An unexpected error occurred. Please try again later.'
        },
        500,
        { originalError: error.message },
        cId
      )
      return appError.toApiError()
    }

    // Handle objects with code and message properties (legacy format)
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as { code?: string; message?: string }
      if (errorObj.code && errorObj.message) {
        const statusCode = ERROR_STATUS_MAP[errorObj.code as keyof typeof ERROR_STATUS_MAP] || 500
        
        const appError = new AppError(
          (errorObj.code as keyof typeof ErrorCodes) || ErrorCodes.UNKNOWN_ERROR,
          errorObj.message,
          {
            category: ErrorCategory.SYSTEM,
            severity: ErrorSeverity.MEDIUM,
            retryable: false,
            userMessage: 'An error occurred while processing your request.'
          },
          statusCode,
          undefined,
          cId
        )
        return appError.toApiError()
      }
    }

    // Fallback for unknown error types
    const appError = new AppError(
      ErrorCodes.UNKNOWN_ERROR,
      String(error),
      {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        userMessage: 'An unexpected error occurred. Please try again later.'
      },
      500,
      { originalError: String(error) },
      cId
    )

    return appError.toApiError()
  }
}

/**
 * Normalize any error to a standard format
 * This is the main entry point for error handling
 */
export function normalizeError(error: unknown, correlationId?: string): ApiError {
  const handler = new DefaultErrorHandler()
  const cId = correlationId || generateCorrelationId()

  // Handle specific error types
  if (error instanceof z.ZodError) {
    return handler.handleValidationError(error, cId)
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handler.handleDatabaseError(error, cId)
  }

  if (error instanceof AppError) {
    return error.toApiError()
  }

  // Handle errors by message content for legacy compatibility
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // Check for JSON parse errors FIRST before any other checks
    if (message.includes('json') || message.includes('unexpected token') || message.includes('invalid json')) {
      // Return a simple validation error for malformed JSON in request body
      return createApiError(
        ErrorCodes.BAD_JSON,
        'Invalid JSON in request body',
        { originalError: error.message },
        cId
      )
    }
    
    if (message.includes('auth') || message.includes('token') || message.includes('credential')) {
      return handler.handleAuthError(error, cId)
    }
    
    // ONLY treat EXPLICIT file-related errors as file processing (not generic 'parse')
    if (message.includes('file') || message.includes('upload') || message.includes('pdf') || message.includes('docx') || message.includes('resume')) {
      // But exclude JSON body parse errors that happen to mention files
      if (!message.includes('json') && !message.includes('body')) {
        return handler.handleFileProcessingError(error, undefined, cId)
      }
    }
    
    if (message.includes('rate') || message.includes('limit')) {
      return handler.handleRateLimitError(60, cId)
    }
    
    if (message.includes('openai') || message.includes('ai') || message.includes('external')) {
      return handler.handleExternalServiceError(error, 'AI Service', cId)
    }
  }

  // Fallback to generic error handling
  return handler.handleGenericError(error, cId)
}

/**
 * Create a standardized API error response
 */
export function createApiError(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: Record<string, any>,
  correlationId?: string
): ApiError {
  const statusCode = ERROR_STATUS_MAP[code] || 500
  
  return {
    code,
    message,
    details,
    correlationId: correlationId || generateCorrelationId(),
    timestamp: new Date().toISOString(),
    statusCode
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: ApiError | AppError): boolean {
  if (error instanceof AppError) {
    return error.isRetryable()
  }
  
  // Check by error code for ApiError
  const retryableCodes = [
    ErrorCodes.CONNECTION_FAILED,
    ErrorCodes.TIMEOUT,
    ErrorCodes.EXTERNAL_SERVICE_ERROR,
    ErrorCodes.AI_SERVICE_ERROR,
    ErrorCodes.OPENAI_ERROR,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.CONNECTION_TIMEOUT,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    ErrorCodes.TOO_MANY_REQUESTS,
    ErrorCodes.FILE_PROCESSING_FAILED
  ]
  
  return retryableCodes.includes(error.code as typeof retryableCodes[number])
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: ApiError | AppError): ErrorSeverity {
  if (error instanceof AppError) {
    return error.getSeverity()
  }
  
  // Determine severity by status code for ApiError
  const statusCode = error.statusCode || 500
  
  if (statusCode >= 500) {
    return ErrorSeverity.HIGH
  } else if (statusCode >= 400) {
    return ErrorSeverity.MEDIUM
  } else {
    return ErrorSeverity.LOW
  }
}

/**
 * Export the default error handler instance
 */
export const errorHandler = new DefaultErrorHandler()