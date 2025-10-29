/**
 * Circuit Breaker Pattern Implementation for AI Service Calls
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

import { getAiServiceLogger } from '../logging'
import { ErrorCodes } from '../errors/types'

const logger = getAiServiceLogger()

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Service is failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number     // Number of failures before opening circuit
  successThreshold: number     // Number of successes to close from half-open
  timeout: number              // Time in ms before attempting half-open
  monitoringPeriod: number     // Time window for failure tracking in ms
}

export interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  consecutiveFailures: number
  consecutiveSuccesses: number
  lastFailureTime: number | null
  lastSuccessTime: number | null
  totalRequests: number
  rejectedRequests: number
}

/**
 * Circuit breaker to protect against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures = 0
  private successes = 0
  private consecutiveFailures = 0
  private consecutiveSuccesses = 0
  private lastFailureTime: number | null = null
  private lastSuccessTime: number | null = null
  private totalRequests = 0
  private rejectedRequests = 0
  private nextAttempt = 0
  
  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    logger.info('Circuit breaker initialized', {
      name,
      config
    })
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed to try half-open
      if (Date.now() >= this.nextAttempt) {
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          name: this.name,
          nextAttempt: this.nextAttempt
        })
        this.state = CircuitState.HALF_OPEN
        this.consecutiveSuccesses = 0
      } else {
        this.rejectedRequests++
        logger.warn('Circuit breaker OPEN - request rejected', {
          name: this.name,
          state: this.state,
          nextAttempt: this.nextAttempt,
          timeUntilRetry: this.nextAttempt - Date.now()
        })
        throw {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: `Circuit breaker is OPEN for ${this.name}. Service temporarily unavailable.`,
          retryAfter: Math.ceil((this.nextAttempt - Date.now()) / 1000)
        }
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error)
      throw error
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++
    this.consecutiveSuccesses++
    this.consecutiveFailures = 0
    this.lastSuccessTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        logger.info('Circuit breaker transitioning to CLOSED', {
          name: this.name,
          consecutiveSuccesses: this.consecutiveSuccesses,
          threshold: this.config.successThreshold
        })
        this.state = CircuitState.CLOSED
        this.failures = 0
        this.consecutiveFailures = 0
      }
    }

    // Clean up old failures outside monitoring period
    if (this.lastFailureTime && 
        Date.now() - this.lastFailureTime > this.config.monitoringPeriod) {
      this.failures = 0
      this.consecutiveFailures = 0
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: unknown): void {
    this.failures++
    this.consecutiveFailures++
    this.consecutiveSuccesses = 0
    this.lastFailureTime = Date.now()

    logger.warn('Circuit breaker recorded failure', {
      name: this.name,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.config.failureThreshold,
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    // Transition to OPEN if threshold exceeded
    if (this.state === CircuitState.HALF_OPEN || 
        this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      this.nextAttempt = Date.now() + this.config.timeout

      logger.error('Circuit breaker transitioning to OPEN', undefined, {
        name: this.name,
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.config.failureThreshold,
        timeout: this.config.timeout,
        nextAttempt: this.nextAttempt
      })
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests
    }
  }

  /**
   * Manually reset the circuit breaker (for testing/admin)
   */
  reset(): void {
    logger.info('Circuit breaker manually reset', { name: this.name })
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successes = 0
    this.consecutiveFailures = 0
    this.consecutiveSuccesses = 0
    this.lastFailureTime = null
    this.lastSuccessTime = null
    this.nextAttempt = 0
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * Check if circuit is available for requests
   */
  isAvailable(): boolean {
    return this.state !== CircuitState.OPEN || Date.now() >= this.nextAttempt
  }
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,        // Open after 5 consecutive failures
  successThreshold: 2,        // Close after 2 consecutive successes in half-open
  timeout: 60000,             // Wait 60s before attempting half-open
  monitoringPeriod: 120000    // Track failures over 2 minute window
}

/**
 * Circuit breaker registry to manage multiple breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(
        name,
        config || DEFAULT_CIRCUIT_BREAKER_CONFIG
      )
      this.breakers.set(name, breaker)
    }
    return this.breakers.get(name)!
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {}
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats()
    }
    return stats
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(name: string): boolean {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.reset()
      return true
    }
    return false
  }
}

// Global circuit breaker registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry()
