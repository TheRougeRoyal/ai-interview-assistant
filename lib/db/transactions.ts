/**
 * Enhanced transaction utilities with comprehensive error handling and logging
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from './client'
import { 
  DatabaseError, 
  ErrorCodes, 
  getCorrelationId 
} from '@/lib/errors'
import { 
  getDatabaseLogger, 
  measureAsync 
} from '@/lib/logging'
import type { PrismaTransaction } from './repositories/base'

/**
 * Transaction options
 */
export interface TransactionOptions {
  maxWait?: number
  timeout?: number
  isolationLevel?: Prisma.TransactionIsolationLevel
  enableLogging?: boolean
  enablePerformanceTracking?: boolean
  retryAttempts?: number
  retryDelay?: number
}

/**
 * Transaction result with metadata
 */
export interface TransactionResult<T> {
  result: T
  duration: number
  correlationId: string
  retryCount: number
}

/**
 * Transaction manager class
 */
export class TransactionManager {
  private logger = getDatabaseLogger()
  private client: PrismaClient

  constructor(client: PrismaClient = prisma) {
    this.client = client
  }

  /**
   * Execute a function within a transaction with comprehensive error handling
   */
  async execute<T>(
    fn: (tx: PrismaTransaction) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const {
      maxWait = 5000,
      timeout = 30000,
      isolationLevel,
      enableLogging = true,
      enablePerformanceTracking = true,
      retryAttempts = 3,
      retryDelay = 1000
    } = options

    const correlationId = getCorrelationId()
    let retryCount = 0
    let lastError: any

    const executeTransaction = async (): Promise<T> => {
      return this.client.$transaction(
        async (tx) => {
          if (enableLogging) {
            this.logger.debug('Transaction started', {
              correlationId,
              retryCount,
              isolationLevel,
              maxWait,
              timeout
            })
          }

          try {
            const result = await fn(tx)

            if (enableLogging) {
              this.logger.debug('Transaction completed successfully', {
                correlationId,
                retryCount
              })
            }

            return result
          } catch (error) {
            if (enableLogging) {
              this.logger.error('Transaction failed', 
                error instanceof Error ? error : new Error(String(error)), {
                correlationId,
                retryCount
              })
            }
            throw error
          }
        },
        {
          maxWait,
          timeout,
          isolationLevel
        }
      )
    }

    // Execute with retry logic
    while (retryCount <= retryAttempts) {
      try {
        if (enablePerformanceTracking) {
          const result = await measureAsync(
            'database.transaction',
            executeTransaction,
            this.logger
          )

          return {
            result,
            duration: 0, // Will be set by measureAsync
            correlationId,
            retryCount
          }
        } else {
          const startTime = Date.now()
          const result = await executeTransaction()
          const duration = Date.now() - startTime

          return {
            result,
            duration,
            correlationId,
            retryCount
          }
        }
      } catch (error) {
        lastError = error
        retryCount++

        // Check if error is retryable
        if (retryCount <= retryAttempts && this.isRetryableError(error)) {
          if (enableLogging) {
            this.logger.warn(`Transaction failed, retrying (${retryCount}/${retryAttempts})`, {
              correlationId,
              error: error instanceof Error ? error.message : String(error),
              retryDelay
            })
          }

          // Wait before retry with exponential backoff
          await this.delay(retryDelay * Math.pow(2, retryCount - 1))
          continue
        }

        // Transform and throw error
        this.handleTransactionError(error, correlationId)
      }
    }

    // This should never be reached, but just in case
    this.handleTransactionError(lastError, correlationId)
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeMultiple<T extends Record<string, any>>(
    operations: {
      [K in keyof T]: (tx: PrismaTransaction) => Promise<T[K]>
    },
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    return this.execute(async (tx) => {
      const results = {} as T
      
      for (const [key, operation] of Object.entries(operations)) {
        results[key as keyof T] = await operation(tx)
      }
      
      return results
    }, options)
  }

  /**
   * Execute operations in sequence within a transaction
   */
  async executeSequence<T>(
    operations: Array<(tx: PrismaTransaction) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.execute(async (tx) => {
      const results: T[] = []
      
      for (const operation of operations) {
        const result = await operation(tx)
        results.push(result)
      }
      
      return results
    }, options)
  }

  /**
   * Execute operations in parallel within a transaction
   */
  async executeParallel<T>(
    operations: Array<(tx: PrismaTransaction) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.execute(async (tx) => {
      return Promise.all(operations.map(op => op(tx)))
    }, options)
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Retry on connection errors, timeouts, and deadlocks
      return ['P1001', 'P1002', 'P1008', 'P2034'].includes(error.code)
    }
    
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      // Retry on unknown request errors (might be temporary)
      return true
    }
    
    return false
  }

  /**
   * Handle transaction errors with proper transformation
   */
  private handleTransactionError(error: any, correlationId: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2034':
          throw new DatabaseError(
            ErrorCodes.TRANSACTION_FAILED,
            'Transaction conflict detected',
            error,
            correlationId
          )
        case 'P1008':
          throw new DatabaseError(
            ErrorCodes.TIMEOUT,
            'Transaction timeout',
            error,
            correlationId
          )
        case 'P1001':
        case 'P1002':
          throw new DatabaseError(
            ErrorCodes.CONNECTION_FAILED,
            'Database connection failed during transaction',
            error,
            correlationId
          )
        default:
          throw new DatabaseError(
            ErrorCodes.TRANSACTION_FAILED,
            'Transaction failed',
            error,
            correlationId
          )
      }
    }

    throw new DatabaseError(
      ErrorCodes.TRANSACTION_FAILED,
      'Transaction failed with unexpected error',
      error instanceof Error ? error : new Error(String(error)),
      correlationId
    )
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Global transaction manager instance
 */
export const transactionManager = new TransactionManager()

/**
 * Convenience functions for transaction management
 */
export const withTransaction = transactionManager.execute.bind(transactionManager)
export const withMultipleTransactions = transactionManager.executeMultiple.bind(transactionManager)
export const withSequentialTransactions = transactionManager.executeSequence.bind(transactionManager)
export const withParallelTransactions = transactionManager.executeParallel.bind(transactionManager)

/**
 * Transaction decorator for automatic transaction wrapping
 */
export function Transactional(options: TransactionOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const result = await transactionManager.execute(
        async (tx) => {
          // Replace prisma client with transaction client in the context
          const originalPrisma = (this as any).prisma || prisma
          ;(this as any).prisma = tx
          
          try {
            return await method.apply(this, args)
          } finally {
            // Restore original prisma client
            ;(this as any).prisma = originalPrisma
          }
        },
        options
      )
      
      return result.result
    }

    return descriptor
  }
}

/**
 * Batch operation utilities
 */
export class BatchOperations {
  private static logger = getDatabaseLogger()

  /**
   * Execute operations in batches to avoid memory issues
   */
  static async executeBatch<T, R>(
    items: T[],
    batchSize: number,
    operation: (batch: T[], tx: PrismaTransaction) => Promise<R[]>,
    options: TransactionOptions = {}
  ): Promise<R[]> {
    const results: R[] = []
    const batches = this.createBatches(items, batchSize)
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const correlationId = getCorrelationId()
      
      this.logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
        correlationId,
        batchSize: batch.length,
        totalItems: items.length
      })
      
      const batchResult = await transactionManager.execute(
        async (tx) => operation(batch, tx),
        options
      )
      
      results.push(...batchResult.result)
    }
    
    return results
  }

  /**
   * Create batches from array
   */
  private static createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    
    return batches
  }
}