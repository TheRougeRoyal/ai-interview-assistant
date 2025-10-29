/**
 * Performance timing utilities for logging
 */

import { PerformanceTimer } from './types'
import { getCorrelationId } from '@/lib/errors/correlation'

/**
 * Performance timer implementation
 */
export class AppPerformanceTimer implements PerformanceTimer {
  private startTime: number = 0
  private endTime: number = 0
  private isRunning: boolean = false

  start(): void {
    this.startTime = performance.now()
    this.endTime = 0
    this.isRunning = true
  }

  end(): number {
    if (!this.isRunning) {
      throw new Error('Timer not started')
    }
    
    this.endTime = performance.now()
    this.isRunning = false
    return this.getDuration()
  }

  getDuration(): number {
    if (this.isRunning) {
      return performance.now() - this.startTime
    }
    return this.endTime - this.startTime
  }

  getStartTime(): number {
    return this.startTime
  }

  getEndTime(): number {
    return this.endTime
  }
}

/**
 * Performance measurement decorator
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
  const method = descriptor.value!

  descriptor.value = (async function (this: any, ...args: any[]) {
    const timer = new AppPerformanceTimer()
    const correlationId = getCorrelationId()
    
    timer.start()
    
    try {
      const result = await method.apply(this, args)
      const duration = timer.end()
      
      // Log performance if logger is available
      if (this.logger && typeof this.logger.logPerformance === 'function') {
        this.logger.logPerformance({
          category: 'performance' as any,
          message: `Method ${propertyName} executed`,
          correlationId,
          performance: {
            operation: `${target.constructor.name}.${propertyName}`,
            duration,
            startTime: timer.getStartTime(),
            endTime: timer.getEndTime()
          }
        })
      }
      
      return result
    } catch (error) {
      const duration = timer.end()
      
      // Log performance even on error
      if (this.logger && typeof this.logger.logPerformance === 'function') {
        this.logger.logPerformance({
          category: 'performance' as any,
          message: `Method ${propertyName} failed`,
          correlationId,
          performance: {
            operation: `${target.constructor.name}.${propertyName}`,
            duration,
            startTime: timer.getStartTime(),
            endTime: timer.getEndTime()
          },
          metadata: { error: error instanceof Error ? error.message : String(error) }
        })
      }
      
      throw error
    }
  }) as any

  return descriptor
}

/**
 * Async performance measurement utility
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  logger?: { logPerformance: (entry: any) => void }
): Promise<T> {
  const timer = new AppPerformanceTimer()
  const correlationId = getCorrelationId()
  
  timer.start()
  
  try {
    const result = await fn()
    const duration = timer.end()
    
    if (logger) {
      logger.logPerformance({
        category: 'performance' as any,
        message: `Operation ${operation} completed`,
        correlationId,
        performance: {
          operation,
          duration,
          startTime: timer.getStartTime(),
          endTime: timer.getEndTime()
        }
      })
    }
    
    return result
  } catch (error) {
    const duration = timer.end()
    
    if (logger) {
      logger.logPerformance({
        category: 'performance' as any,
        message: `Operation ${operation} failed`,
        correlationId,
        performance: {
          operation,
          duration,
          startTime: timer.getStartTime(),
          endTime: timer.getEndTime()
        },
        metadata: { error: error instanceof Error ? error.message : String(error) }
      })
    }
    
    throw error
  }
}

/**
 * Synchronous performance measurement utility
 */
export function measureSync<T>(
  operation: string,
  fn: () => T,
  logger?: { logPerformance: (entry: any) => void }
): T {
  const timer = new AppPerformanceTimer()
  const correlationId = getCorrelationId()
  
  timer.start()
  
  try {
    const result = fn()
    const duration = timer.end()
    
    if (logger) {
      logger.logPerformance({
        category: 'performance' as any,
        message: `Operation ${operation} completed`,
        correlationId,
        performance: {
          operation,
          duration,
          startTime: timer.getStartTime(),
          endTime: timer.getEndTime()
        }
      })
    }
    
    return result
  } catch (error) {
    const duration = timer.end()
    
    if (logger) {
      logger.logPerformance({
        category: 'performance' as any,
        message: `Operation ${operation} failed`,
        correlationId,
        performance: {
          operation,
          duration,
          startTime: timer.getStartTime(),
          endTime: timer.getEndTime()
        },
        metadata: { error: error instanceof Error ? error.message : String(error) }
      })
    }
    
    throw error
  }
}

/**
 * Create a performance timer
 */
export function createTimer(): PerformanceTimer {
  return new AppPerformanceTimer()
}

/**
 * Performance monitoring middleware for functions
 */
export function withPerformanceLogging<T extends (...args: any[]) => any>(
  fn: T,
  operation: string,
  logger?: { logPerformance: (entry: any) => void }
): T {
  return ((...args: any[]) => {
    if (fn.constructor.name === 'AsyncFunction') {
      return measureAsync(operation, () => fn(...args), logger)
    } else {
      return measureSync(operation, () => fn(...args), logger)
    }
  }) as T
}