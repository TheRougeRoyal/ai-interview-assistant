/**
 * Tests for the standardized error handling system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import {
  normalizeError,
  ValidationError,
  AuthenticationError,
  DatabaseError,
  ExternalServiceError,
  ErrorCodes,
  generateCorrelationId,
  createApiError,
  isRetryableError
} from '../handlers'
import {
  createCorrelationContext,
  getCorrelationId,
  withCorrelationContext
} from '../correlation'

describe('Error Handling System', () => {
  beforeEach(() => {
    // Reset any correlation context
  })

  describe('Error Normalization', () => {
    it('should normalize Zod validation errors', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email()
      })
      
      try {
        schema.parse({ name: '', email: 'invalid' })
      } catch (error) {
        const normalized = normalizeError(error)
        
        expect(normalized.code).toBe(ErrorCodes.VALIDATION_FAILED)
        expect(normalized.message).toBe('Validation failed')
        expect(normalized.details?.fieldErrors).toBeDefined()
        expect(normalized.correlationId).toBeDefined()
        expect(normalized.timestamp).toBeDefined()
      }
    })

    it('should normalize generic errors', () => {
      const error = new Error('Something went wrong')
      const normalized = normalizeError(error)
      
      expect(normalized.code).toBe(ErrorCodes.INTERNAL_SERVER_ERROR)
      expect(normalized.message).toBe('Something went wrong')
      expect(normalized.correlationId).toBeDefined()
      expect(normalized.statusCode).toBe(500)
    })

    it('should handle legacy error format', () => {
      const legacyError = {
        code: 'OPENAI_ERROR',
        message: 'OpenAI service unavailable'
      }
      
      const normalized = normalizeError(legacyError)
      
      expect(normalized.code).toBe('OPENAI_ERROR')
      expect(normalized.message).toBe('OpenAI service unavailable')
      expect(normalized.statusCode).toBe(502)
    })
  })

  describe('Custom Error Classes', () => {
    it('should create validation errors correctly', () => {
      const error = new ValidationError(
        'Invalid input',
        { email: ['Invalid email format'] }
      )
      
      expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED)
      expect(error.statusCode).toBe(422)
      expect(error.fieldErrors.email).toEqual(['Invalid email format'])
      expect(error.isRetryable()).toBe(false)
    })

    it('should create authentication errors correctly', () => {
      const error = new AuthenticationError(
        ErrorCodes.TOKEN_EXPIRED,
        'Token has expired'
      )
      
      expect(error.code).toBe(ErrorCodes.TOKEN_EXPIRED)
      expect(error.statusCode).toBe(401)
      expect(error.isRetryable()).toBe(false)
    })

    it('should create external service errors correctly', () => {
      const error = new ExternalServiceError(
        'OpenAI',
        'Service temporarily unavailable'
      )
      
      expect(error.code).toBe(ErrorCodes.EXTERNAL_SERVICE_ERROR)
      expect(error.statusCode).toBe(502)
      expect(error.isRetryable()).toBe(true)
    })
  })

  describe('Correlation ID System', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^\d+[a-z0-9]+-[a-z0-9]+$/)
    })

    it('should maintain correlation context', () => {
      const context = createCorrelationContext('test-correlation-id')
      
      withCorrelationContext(context, () => {
        const currentId = getCorrelationId()
        expect(currentId).toBe('test-correlation-id')
      })
    })
  })

  describe('Error Utilities', () => {
    it('should identify retryable errors correctly', () => {
      const retryableError = createApiError(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Service unavailable'
      )
      
      const nonRetryableError = createApiError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid input'
      )
      
      expect(isRetryableError(retryableError)).toBe(true)
      expect(isRetryableError(nonRetryableError)).toBe(false)
    })

    it('should create API errors with proper structure', () => {
      const error = createApiError(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        { reason: 'missing_token' }
      )
      
      expect(error.code).toBe(ErrorCodes.UNAUTHORIZED)
      expect(error.message).toBe('Authentication required')
      expect(error.details?.reason).toBe('missing_token')
      expect(error.statusCode).toBe(401)
      expect(error.correlationId).toBeDefined()
      expect(error.timestamp).toBeDefined()
    })
  })
})