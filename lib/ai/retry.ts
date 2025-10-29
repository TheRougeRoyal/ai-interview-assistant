/**
 * Retry Mechanism for Transient AI Service Failures
 * Implements exponential backoff with jitter for failed requests
 */

import { getAiServiceLogger } from '../logging'
import { ErrorCodes } from '../errors/types'

const logger = getAiServiceLogger()

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number          // Base delay in ms
  maxDelay: number           // Maximum delay in ms
  backoffMultiplier: number  // Exponential backoff multiplier
  jitter: boolean            // Add randomness to delay
  retryableErrors: string[]  // Error codes that should be retried
}

export interface RetryResult<T> {
  result: T
  attempts: number
  totalTime: number
  errors: any[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,         // 1 second
  maxDelay: 30000,         // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    ErrorCodes.TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.CONNECTION_TIMEOUT,
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.EXTERNAL_SERVICE_ERROR,
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED'
  ]
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false
  
  // Check error code
  const code = error.code || error.name || ''
  if (retryableErrors.includes(code)) {
    return true
  }

  // Check HTTP status codes (if present)
  const status = error.status || error.statusCode || 0
  if (status >= 500 && status < 600) {
    return true // Server errors are retryable
  }
  if (status === 429) {
    return true // Rate limit errors are retryable
  }

  // Check for specific error messages
  const message = (error.message || '').toLowerCase()
  if (message.includes('timeout') || 
      message.includes('network') || 
      message.includes('unavailable') ||
      message.includes('econnreset') ||
      message.includes('econnrefused')) {
    return true
  }

  return false
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  useJitter: boolean
): number {
  // Calculate exponential backoff
  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)
  
  // Cap at max delay
  let delay = Math.min(exponentialDelay, maxDelay)
  
  // Add jitter (randomness between 0% and 25% of delay)
  if (useJitter) {
    const jitterAmount = delay * 0.25 * Math.random()
    delay = delay + jitterAmount
  }
  
  return Math.floor(delay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry wrapper for async functions with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  const errors: any[] = []
  let lastError: any

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.debug('Retry attempt', {
        context,
        attempt,
        maxAttempts: config.maxAttempts
      })

      const result = await fn()
      
      const totalTime = Date.now() - startTime
      logger.info('Retry succeeded', {
        context,
        attempt,
        totalTime,
        previousErrors: errors.length
      })

      return {
        result,
        attempts: attempt,
        totalTime,
        errors
      }
    } catch (error) {
      lastError = error
      errors.push({
        attempt,
        error,
        timestamp: Date.now()
      })

      logger.warn('Retry attempt failed', {
        context,
        attempt,
        maxAttempts: config.maxAttempts,
        error: error instanceof Error ? error.message : String(error),
        errorCode: (error as any)?.code
      })

      // Check if error is retryable
      const shouldRetry = isRetryableError(error, config.retryableErrors)
      
      // If this was the last attempt or error is not retryable, throw
      if (attempt >= config.maxAttempts || !shouldRetry) {
        const totalTime = Date.now() - startTime
        
        logger.error('Retry exhausted or error not retryable', undefined, {
          context,
          attempts: attempt,
          totalTime,
          shouldRetry,
          finalError: error instanceof Error ? error.message : String(error)
        })

        // Throw the last error
        throw lastError
      }

      // Calculate delay and wait before next attempt
      const delay = calculateDelay(
        attempt,
        config.baseDelay,
        config.maxDelay,
        config.backoffMultiplier,
        config.jitter
      )

      logger.debug('Waiting before retry', {
        context,
        attempt,
        delay,
        nextAttempt: attempt + 1
      })

      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}

/**
 * Create a retry wrapper function with specific configuration
 */
export function createRetryWrapper<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {},
  context?: string
): (...args: TArgs) => Promise<TResult> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  
  return async (...args: TArgs): Promise<TResult> => {
    const result = await retryWithBackoff(
      () => fn(...args),
      fullConfig,
      context
    )
    return result.result
  }
}

/**
 * Retry statistics for monitoring
 */
export interface RetryStats {
  totalAttempts: number
  successfulFirstAttempts: number
  successfulRetries: number
  failedRetries: number
  averageAttempts: number
  averageRetryTime: number
}

/**
 * Simple retry statistics collector
 */
class RetryStatsCollector {
  private stats = {
    totalAttempts: 0,
    successfulFirstAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    totalRetryTime: 0,
    totalSuccessfulAttempts: 0
  }

  recordSuccess(attempts: number, totalTime: number): void {
    this.stats.totalAttempts += attempts
    
    if (attempts === 1) {
      this.stats.successfulFirstAttempts++
    } else {
      this.stats.successfulRetries++
      this.stats.totalRetryTime += totalTime
      this.stats.totalSuccessfulAttempts += attempts
    }
  }

  recordFailure(attempts: number): void {
    this.stats.totalAttempts += attempts
    this.stats.failedRetries++
  }

  getStats(): RetryStats {
    const totalSuccesses = this.stats.successfulFirstAttempts + this.stats.successfulRetries
    
    return {
      totalAttempts: this.stats.totalAttempts,
      successfulFirstAttempts: this.stats.successfulFirstAttempts,
      successfulRetries: this.stats.successfulRetries,
      failedRetries: this.stats.failedRetries,
      averageAttempts: totalSuccesses > 0 
        ? this.stats.totalAttempts / totalSuccesses 
        : 0,
      averageRetryTime: this.stats.successfulRetries > 0
        ? this.stats.totalRetryTime / this.stats.successfulRetries
        : 0
    }
  }

  reset(): void {
    this.stats = {
      totalAttempts: 0,
      successfulFirstAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      totalRetryTime: 0,
      totalSuccessfulAttempts: 0
    }
  }
}

// Global retry stats collector
export const retryStats = new RetryStatsCollector()
