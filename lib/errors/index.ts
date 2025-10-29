/**
 * Centralized error handling exports
 * Provides a single entry point for all error handling utilities
 */

// Core error types and classes
export type {
  ApiError,
  ErrorSeverity,
  ErrorCategory
} from './types'

export {
  ErrorCodes,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalServiceError,
  FileProcessingError,
  RateLimitError,
  generateCorrelationId,
  ERROR_STATUS_MAP
} from './types'

// Error handlers
export type {
  ErrorHandler
} from './handlers'

export {
  DefaultErrorHandler,
  normalizeError,
  createApiError,
  isRetryableError,
  getErrorSeverity,
  errorHandler
} from './handlers'

// Correlation utilities
export type {
  CorrelationContext
} from './correlation'

export {
  setCorrelationContext,
  getCorrelationContext,
  getCorrelationId,
  getRequestId,
  getCurrentUserId,
  getCurrentSessionId,
  createCorrelationContext,
  withCorrelationContext,
  withCorrelationContextAsync,
  updateCorrelationContext,
  addCorrelationMetadata,
  getCorrelationMetadata,
  extractCorrelationId,
  createCorrelationHeaders,
  withCorrelationId,
  getRequestDuration,
  createChildCorrelationContext,
  generateRequestId
} from './correlation'

// HTTP utilities (re-export for convenience)
export {
  json,
  handleApiError,
  success,
  errorResponse
} from '../http/errors'