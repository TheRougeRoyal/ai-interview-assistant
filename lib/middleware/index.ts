/**
 * Centralized middleware exports
 * Provides a single entry point for all middleware utilities
 */

// Core middleware stack
export {
  createMiddlewareStack,
  withMiddleware,
  MiddlewarePresets,
  type MiddlewareConfig,
  type RequestContext,
  type MiddlewareHandler
} from './stack'

// Correlation tracking
export {
  withCorrelationMiddleware,
  createApiHandler,
  correlationMiddleware
} from './correlation'

// Enhanced rate limiting
export {
  createRateLimit,
  rateLimit,
  userKeyGenerator,
  routeKeyGenerator,
  getRateLimitHeaders,
  RateLimitPresets,
  MemoryRateLimitStore,
  type RateLimitConfig,
  type RateLimitStore,
  type RateLimitData
} from './rateLimit'

// Validation
export {
  createValidation,
  withValidation,
  ValidationPresets,
  CommonSchemas,
  type ValidationConfig,
  type ValidationResult,
  type FileValidationConfig
} from './validation'