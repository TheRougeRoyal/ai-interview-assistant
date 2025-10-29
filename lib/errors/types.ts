/**
 * Standardized error types and interfaces for the AI Interview System
 * Provides comprehensive error handling with correlation IDs and structured error responses
 */

import { z } from 'zod'

/**
 * Standard API error interface with correlation tracking
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  correlationId: string
  timestamp: string
  statusCode?: number
}

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  FILE_PROCESSING = 'file_processing',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  SYSTEM = 'system',
  BUSINESS_LOGIC = 'business_logic'
}

/**
 * Standard error codes used throughout the application
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  OPENAI_ERROR: 'OPENAI_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  
  // File processing errors
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  
  // System errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',
  UNSUPPORTED_TASK: 'UNSUPPORTED_TASK',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  BAD_JSON: 'BAD_JSON'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * Error metadata for enhanced error tracking
 */
export interface ErrorMetadata {
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  userMessage?: string
  technicalDetails?: Record<string, any>
  suggestedAction?: string
}

/**
 * Enhanced error class with metadata and correlation tracking
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly correlationId: string
  public readonly timestamp: string
  public readonly metadata: ErrorMetadata
  public readonly statusCode: number
  public readonly details?: Record<string, any>

  constructor(
    code: ErrorCode,
    message: string,
    metadata: ErrorMetadata,
    statusCode: number = 500,
    details?: Record<string, any>,
    correlationId?: string
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.correlationId = correlationId || generateCorrelationId()
    this.timestamp = new Date().toISOString()
    this.metadata = metadata
    this.statusCode = statusCode
    this.details = details
  }

  /**
   * Convert to API error format
   */
  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.metadata.userMessage || this.message,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      statusCode: this.statusCode
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.metadata.retryable
  }

  /**
   * Get error severity
   */
  getSeverity(): ErrorSeverity {
    return this.metadata.severity
  }

  /**
   * Get error category
   */
  getCategory(): ErrorCategory {
    return this.metadata.category
  }
}

/**
 * Validation error for Zod schema failures
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>

  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    correlationId?: string
  ) {
    super(
      ErrorCodes.VALIDATION_FAILED,
      message,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        userMessage: 'Please check your input and try again.',
        technicalDetails: { fieldErrors }
      },
      422,
      { fieldErrors },
      correlationId
    )
    this.fieldErrors = fieldErrors
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(
    code: ErrorCode = ErrorCodes.UNAUTHORIZED,
    message: string = 'Authentication required',
    correlationId?: string
  ) {
    super(
      code,
      message,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: 'Please log in to continue.',
        suggestedAction: 'Redirect to login page'
      },
      401,
      undefined,
      correlationId
    )
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    resource?: string,
    correlationId?: string
  ) {
    super(
      ErrorCodes.FORBIDDEN,
      message,
      {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage: 'You do not have permission to perform this action.',
        technicalDetails: { resource }
      },
      403,
      { resource },
      correlationId
    )
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    correlationId?: string
  ) {
    super(
      code,
      message,
      {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retryable: code === ErrorCodes.CONNECTION_FAILED || code === ErrorCodes.TIMEOUT,
        userMessage: 'A database error occurred. Please try again later.',
        technicalDetails: { originalError: originalError?.message }
      },
      500,
      { originalError: originalError?.message },
      correlationId
    )
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    originalError?: Error,
    correlationId?: string
  ) {
    super(
      ErrorCodes.EXTERNAL_SERVICE_ERROR,
      message,
      {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        userMessage: 'An external service is temporarily unavailable. Please try again later.',
        technicalDetails: { service, originalError: originalError?.message }
      },
      502,
      { service, originalError: originalError?.message },
      correlationId
    )
  }
}

/**
 * File processing error
 */
export class FileProcessingError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    fileName?: string,
    correlationId?: string
  ) {
    super(
      code,
      message,
      {
        category: ErrorCategory.FILE_PROCESSING,
        severity: ErrorSeverity.MEDIUM,
        retryable: code === ErrorCodes.FILE_PROCESSING_FAILED,
        userMessage: 'File processing failed. Please check your file and try again.',
        technicalDetails: { fileName }
      },
      400,
      { fileName },
      correlationId
    )
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number

  constructor(
    retryAfter: number = 60,
    correlationId?: string
  ) {
    super(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.LOW,
        retryable: true,
        userMessage: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        technicalDetails: { retryAfter }
      },
      429,
      { retryAfter },
      correlationId
    )
    this.retryAfter = retryAfter
  }
}

/**
 * Generate a unique correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * HTTP status code mapping for error codes
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // Validation errors - 4xx
  [ErrorCodes.VALIDATION_FAILED]: 422,
  [ErrorCodes.SCHEMA_VALIDATION_FAILED]: 422,
  [ErrorCodes.INVALID_INPUT]: 400,
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCodes.BAD_JSON]: 400,
  
  // Authentication errors - 401
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.INVALID_TOKEN]: 401,
  [ErrorCodes.TOKEN_EXPIRED]: 401,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  
  // Authorization errors - 403
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.RESOURCE_ACCESS_DENIED]: 403,
  
  // Not found - 404
  [ErrorCodes.RECORD_NOT_FOUND]: 404,
  
  // Conflict - 409
  [ErrorCodes.DUPLICATE_RECORD]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  
  // Rate limiting - 429
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.TOO_MANY_REQUESTS]: 429,
  
  // File errors - 4xx
  [ErrorCodes.FILE_UPLOAD_ERROR]: 400,
  [ErrorCodes.FILE_TOO_LARGE]: 413,
  [ErrorCodes.INVALID_FILE_TYPE]: 415,
  [ErrorCodes.FILE_PROCESSING_FAILED]: 422,
  [ErrorCodes.FILE_CORRUPTED]: 400,
  
  // Business logic - 4xx
  [ErrorCodes.BUSINESS_RULE_VIOLATION]: 422,
  [ErrorCodes.INVALID_STATE_TRANSITION]: 422,
  
  // External services - 5xx
  [ErrorCodes.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCodes.AI_SERVICE_ERROR]: 502,
  [ErrorCodes.OPENAI_ERROR]: 502,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.TIMEOUT]: 504,
  
  // Database errors - 5xx
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CONSTRAINT_VIOLATION]: 500,
  [ErrorCodes.TRANSACTION_FAILED]: 500,
  [ErrorCodes.CONNECTION_FAILED]: 500,
  
  // Network errors - 5xx
  [ErrorCodes.NETWORK_ERROR]: 500,
  [ErrorCodes.CONNECTION_TIMEOUT]: 504,
  
  // System errors - 5xx
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCodes.CONFIGURATION_ERROR]: 500,
  [ErrorCodes.UNSUPPORTED_OPERATION]: 501,
  [ErrorCodes.UNSUPPORTED_TASK]: 501,
  
  // Generic - 5xx
  [ErrorCodes.UNKNOWN_ERROR]: 500
}