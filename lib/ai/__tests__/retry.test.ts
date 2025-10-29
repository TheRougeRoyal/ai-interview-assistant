/**
 * Unit tests for Retry mechanism
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { retryWithBackoff, DEFAULT_RETRY_CONFIG, createRetryWrapper } from '../retry'

describe('Retry Mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const result = await retryWithBackoff(fn, DEFAULT_RETRY_CONFIG)
      
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockResolvedValueOnce('success')
      
      const result = await retryWithBackoff(fn, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10, // Speed up test
        maxAttempts: 3
      })
      
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(3)
      expect(result.errors).toHaveLength(2)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw after max attempts exhausted', async () => {
      const fn = vi.fn().mockRejectedValue({ 
        code: 'TIMEOUT', 
        message: 'persistent timeout' 
      })
      
      await expect(
        retryWithBackoff(fn, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelay: 10,
          maxAttempts: 3
        })
      ).rejects.toMatchObject({
        code: 'TIMEOUT',
        message: 'persistent timeout'
      })
      
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue({ 
        code: 'VALIDATION_FAILED', 
        message: 'invalid input' 
      })
      
      await expect(
        retryWithBackoff(fn, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelay: 10,
          maxAttempts: 3
        })
      ).rejects.toMatchObject({
        code: 'VALIDATION_FAILED'
      })
      
      // Should only try once
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on 5xx status codes', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 503, message: 'service unavailable' })
        .mockResolvedValueOnce('success')
      
      const result = await retryWithBackoff(fn, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10
      })
      
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(2)
    })

    it('should retry on 429 rate limit', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce({ statusCode: 429, message: 'rate limited' })
        .mockResolvedValueOnce('success')
      
      const result = await retryWithBackoff(fn, {
        ...DEFAULT_RETRY_CONFIG,
        baseDelay: 10
      })
      
      expect(result.result).toBe('success')
      expect(result.attempts).toBe(2)
    })

    it('should apply exponential backoff', async () => {
      const delays: number[] = []
      const startTimes: number[] = []
      
      const fn = vi.fn()
        .mockImplementation(() => {
          startTimes.push(Date.now())
          return Promise.reject({ code: 'TIMEOUT', message: 'timeout' })
        })
        .mockResolvedValueOnce('success')
      
      // Capture delays between attempts
      const originalSetTimeout = global.setTimeout
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay: any) => {
        delays.push(delay)
        return originalSetTimeout(cb, 0) // Execute immediately for test
      })
      
      await retryWithBackoff(fn, {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: false,
        retryableErrors: ['TIMEOUT']
      })
      
      // First delay should be ~100ms, second should be ~200ms
      expect(delays[0]).toBeGreaterThanOrEqual(100)
      expect(delays[1]).toBeGreaterThanOrEqual(200)
      
      vi.restoreAllMocks()
    })

    it('should apply jitter when enabled', async () => {
      const delays: number[] = []
      
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockResolvedValueOnce('success')
      
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay: any) => {
        delays.push(delay)
        return setTimeout(cb, 0)
      })
      
      await retryWithBackoff(fn, {
        maxAttempts: 2,
        baseDelay: 100,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryableErrors: ['TIMEOUT']
      })
      
      // With jitter, delay should be between base and base * 1.25
      expect(delays[0]).toBeGreaterThanOrEqual(100)
      expect(delays[0]).toBeLessThanOrEqual(125)
      
      vi.restoreAllMocks()
    })

    it('should respect max delay', async () => {
      const delays: number[] = []
      
      const fn = vi.fn()
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockResolvedValueOnce('success')
      
      vi.spyOn(global, 'setTimeout').mockImplementation((cb: any, delay: any) => {
        delays.push(delay)
        return setTimeout(cb, 0)
      })
      
      await retryWithBackoff(fn, {
        maxAttempts: 4,
        baseDelay: 1000,
        maxDelay: 2000,
        backoffMultiplier: 2,
        jitter: false,
        retryableErrors: ['TIMEOUT']
      })
      
      // All delays should be capped at maxDelay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(2000)
      })
      
      vi.restoreAllMocks()
    })
  })

  describe('createRetryWrapper', () => {
    it('should create a wrapped function with retry logic', async () => {
      const originalFn = vi.fn()
        .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'timeout' })
        .mockResolvedValueOnce('success')
      
      const wrappedFn = createRetryWrapper(
        originalFn,
        { baseDelay: 10, maxAttempts: 3 },
        'test-context'
      )
      
      const result = await wrappedFn('arg1', 'arg2')
      
      expect(result).toBe('success')
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(originalFn).toHaveBeenCalledTimes(2)
    })

    it('should preserve function arguments', async () => {
      const originalFn = vi.fn(async (a: number, b: string) => `${a}-${b}`)
      
      const wrappedFn = createRetryWrapper(originalFn, { baseDelay: 10 })
      
      const result = await wrappedFn(42, 'test')
      
      expect(result).toBe('42-test')
      expect(originalFn).toHaveBeenCalledWith(42, 'test')
    })
  })

  describe('Error Classification', () => {
    it('should retry on network errors', async () => {
      const errors = [
        { code: 'ECONNRESET', message: 'connection reset' },
        { code: 'ETIMEDOUT', message: 'timeout' },
        { code: 'ENOTFOUND', message: 'not found' },
        { code: 'ECONNREFUSED', message: 'connection refused' }
      ]
      
      for (const error of errors) {
        const fn = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success')
        
        const result = await retryWithBackoff(fn, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelay: 10
        })
        
        expect(result.result).toBe('success')
        expect(result.attempts).toBe(2)
      }
    })

    it('should retry on service errors', async () => {
      const errors = [
        { code: 'SERVICE_UNAVAILABLE', message: 'unavailable' },
        { code: 'TIMEOUT', message: 'timeout' },
        { code: 'EXTERNAL_SERVICE_ERROR', message: 'external error' }
      ]
      
      for (const error of errors) {
        const fn = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValueOnce('success')
        
        const result = await retryWithBackoff(fn, {
          ...DEFAULT_RETRY_CONFIG,
          baseDelay: 10
        })
        
        expect(result.result).toBe('success')
        expect(result.attempts).toBe(2)
      }
    })
  })
})
