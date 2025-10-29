/**
 * Unit tests for Circuit Breaker implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CircuitBreaker, CircuitState, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../circuit-breaker'

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker('test-breaker', {
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000
    })
  })

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED)
      expect(breaker.isAvailable()).toBe(true)
    })

    it('should have zero stats initially', () => {
      const stats = breaker.getStats()
      expect(stats.failures).toBe(0)
      expect(stats.successes).toBe(0)
      expect(stats.consecutiveFailures).toBe(0)
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('Success Handling', () => {
    it('should record successful executions', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      await breaker.execute(fn)
      
      const stats = breaker.getStats()
      expect(stats.successes).toBe(1)
      expect(stats.totalRequests).toBe(1)
      expect(stats.consecutiveSuccesses).toBe(1)
    })

    it('should reset consecutive failures on success', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      
      await expect(breaker.execute(fn)).rejects.toThrow()
      await breaker.execute(fn)
      
      const stats = breaker.getStats()
      expect(stats.consecutiveFailures).toBe(0)
      expect(stats.consecutiveSuccesses).toBe(1)
    })
  })

  describe('Failure Handling', () => {
    it('should record failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      const stats = breaker.getStats()
      expect(stats.failures).toBe(1)
      expect(stats.consecutiveFailures).toBe(1)
    })

    it('should open circuit after threshold failures', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      // Fail 3 times (threshold)
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
      expect(breaker.isAvailable()).toBe(false)
    })

    it('should reject requests when circuit is OPEN', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
      
      // Next request should be rejected immediately
      await expect(breaker.execute(fn)).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE'
      })
      
      const stats = breaker.getStats()
      expect(stats.rejectedRequests).toBe(1)
    })
  })

  describe('Half-Open State', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Now should be available (will transition to HALF_OPEN)
      expect(breaker.isAvailable()).toBe(true)
    })

    it('should close circuit after success threshold in HALF_OPEN', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success')
        .mockResolvedValueOnce('success')
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Succeed twice (threshold)
      await breaker.execute(fn)
      await breaker.execute(fn)
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED)
    })

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail again'))
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Fail in HALF_OPEN
      await expect(breaker.execute(fn)).rejects.toThrow('fail again')
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
    })
  })

  describe('Reset', () => {
    it('should reset circuit breaker state', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      
      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      await expect(breaker.execute(fn)).rejects.toThrow()
      
      expect(breaker.getState()).toBe(CircuitState.OPEN)
      
      // Reset
      breaker.reset()
      
      expect(breaker.getState()).toBe(CircuitState.CLOSED)
      expect(breaker.isAvailable()).toBe(true)
      
      const stats = breaker.getStats()
      expect(stats.failures).toBe(0)
      expect(stats.consecutiveFailures).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should track comprehensive statistics', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce('success 1')
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('success 2')
      
      await breaker.execute(fn)
      await expect(breaker.execute(fn)).rejects.toThrow()
      await breaker.execute(fn)
      
      const stats = breaker.getStats()
      expect(stats.totalRequests).toBe(3)
      expect(stats.successes).toBe(2)
      expect(stats.failures).toBe(1)
      expect(stats.consecutiveSuccesses).toBe(1)
      expect(stats.lastSuccessTime).toBeTruthy()
      expect(stats.lastFailureTime).toBeTruthy()
    })
  })
})
