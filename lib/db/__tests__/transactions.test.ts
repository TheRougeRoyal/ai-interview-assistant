/**
 * Tests for transaction utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TransactionManager, withTransaction } from '../transactions'
import { DatabaseError, ErrorCodes } from '@/lib/errors'

// Mock Prisma client
const mockPrismaClient = {
  $transaction: vi.fn()
} as any

describe('Transaction Management', () => {
  let transactionManager: TransactionManager

  beforeEach(() => {
    transactionManager = new TransactionManager(mockPrismaClient)
    vi.clearAllMocks()
  })

  describe('Basic Transaction Execution', () => {
    it('should execute function in transaction successfully', async () => {
      const mockResult = { id: '1', name: 'Test' }
      const mockTx = { testModel: { create: vi.fn().mockResolvedValue(mockResult) } }

      mockPrismaClient.$transaction.mockImplementation(async (fn: any) => {
        return fn(mockTx)
      })

      const result = await transactionManager.execute(async (tx: any) => {
        return tx.testModel.create({ data: { name: 'Test' } })
      })

      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
      expect(result.result).toEqual(mockResult)
      expect(result.correlationId).toBeDefined()
      expect(result.retryCount).toBe(0)
    })

    it('should handle transaction failure', async () => {
      const error = new Error('Transaction failed')
      
      mockPrismaClient.$transaction.mockRejectedValue(error)

      await expect(
        transactionManager.execute(async (tx) => {
          return { success: true }
        })
      ).rejects.toThrow(DatabaseError)
    })

    it('should retry on retryable errors', async () => {
      const retryableError = {
        code: 'P1001', // Connection error
        message: 'Connection failed'
      }
      
      const mockResult = { success: true }

      mockPrismaClient.$transaction
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(mockResult)

      const result = await transactionManager.execute(
        async (tx) => mockResult,
        { retryAttempts: 3, retryDelay: 10 }
      )

      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(3)
      expect(result.result).toEqual(mockResult)
      expect(result.retryCount).toBe(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = {
        code: 'P2002', // Unique constraint violation
        message: 'Unique constraint failed'
      }

      mockPrismaClient.$transaction.mockRejectedValue(nonRetryableError)

      await expect(
        transactionManager.execute(
          async (tx) => ({ success: true }),
          { retryAttempts: 3 }
        )
      ).rejects.toThrow(DatabaseError)

      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('Multiple Operations', () => {
    it('should execute multiple operations in single transaction', async () => {
      const mockResults = {
        user: { id: '1', name: 'John' },
        profile: { id: '1', userId: '1', bio: 'Developer' }
      }

      const mockTx = {
        user: { create: vi.fn().mockResolvedValue(mockResults.user) },
        profile: { create: vi.fn().mockResolvedValue(mockResults.profile) }
      }

      mockPrismaClient.$transaction.mockImplementation(async (fn: any) => {
        return fn(mockTx)
      })

      const operations = {
        user: async (tx: any) => tx.user.create({ data: { name: 'John' } }),
        profile: async (tx: any) => tx.profile.create({ data: { userId: '1', bio: 'Developer' } })
      }

      const result = await transactionManager.executeMultiple(operations)

      expect(result.result.user).toEqual(mockResults.user)
      expect(result.result.profile).toEqual(mockResults.profile)
    })

    it('should execute operations in sequence', async () => {
      const mockResults = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' }
      ]

      const mockTx = {
        testModel: { 
          create: vi.fn()
            .mockResolvedValueOnce(mockResults[0])
            .mockResolvedValueOnce(mockResults[1])
        }
      }

      mockPrismaClient.$transaction.mockImplementation(async (fn: any) => {
        return fn(mockTx)
      })

      const operations = [
        async (tx: any) => tx.testModel.create({ data: { name: 'First' } }),
        async (tx: any) => tx.testModel.create({ data: { name: 'Second' } })
      ]

      const result = await transactionManager.executeSequence(operations)

      expect(result.result).toEqual(mockResults)
      expect(mockTx.testModel.create).toHaveBeenCalledTimes(2)
    })

    it('should execute operations in parallel', async () => {
      const mockResults = [
        { id: '1', name: 'First' },
        { id: '2', name: 'Second' }
      ]

      const mockTx = {
        testModel: { 
          create: vi.fn()
            .mockResolvedValueOnce(mockResults[0])
            .mockResolvedValueOnce(mockResults[1])
        }
      }

      mockPrismaClient.$transaction.mockImplementation(async (fn: any) => {
        return fn(mockTx)
      })

      const operations = [
        async (tx: any) => tx.testModel.create({ data: { name: 'First' } }),
        async (tx: any) => tx.testModel.create({ data: { name: 'Second' } })
      ]

      const result = await transactionManager.executeParallel(operations)

      expect(result.result).toEqual(mockResults)
      expect(mockTx.testModel.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Transformation', () => {
    it('should transform P2034 error to transaction conflict', async () => {
      const prismaError = {
        code: 'P2034',
        message: 'Transaction conflict'
      }

      mockPrismaClient.$transaction.mockRejectedValue(prismaError)

      await expect(
        transactionManager.execute(async (tx) => ({ success: true }))
      ).rejects.toThrow(expect.objectContaining({
        code: ErrorCodes.TRANSACTION_FAILED,
        message: 'Transaction conflict detected'
      }))
    })

    it('should transform P1008 error to timeout', async () => {
      const prismaError = {
        code: 'P1008',
        message: 'Operations timed out'
      }

      mockPrismaClient.$transaction.mockRejectedValue(prismaError)

      await expect(
        transactionManager.execute(async (tx) => ({ success: true }))
      ).rejects.toThrow(expect.objectContaining({
        code: ErrorCodes.TIMEOUT,
        message: 'Transaction timeout'
      }))
    })

    it('should transform connection errors', async () => {
      const prismaError = {
        code: 'P1001',
        message: 'Can\'t reach database server'
      }

      mockPrismaClient.$transaction.mockRejectedValue(prismaError)

      await expect(
        transactionManager.execute(async (tx) => ({ success: true }))
      ).rejects.toThrow(expect.objectContaining({
        code: ErrorCodes.CONNECTION_FAILED,
        message: 'Database connection failed during transaction'
      }))
    })
  })

  describe('Configuration Options', () => {
    it('should use custom timeout and maxWait', async () => {
      const mockResult = { success: true }
      
      mockPrismaClient.$transaction.mockResolvedValue(mockResult)

      await transactionManager.execute(
        async (tx) => mockResult,
        {
          maxWait: 10000,
          timeout: 20000,
          isolationLevel: 'Serializable'
        }
      )

      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        {
          maxWait: 10000,
          timeout: 20000,
          isolationLevel: 'Serializable'
        }
      )
    })

    it('should disable logging when configured', async () => {
      const mockResult = { success: true }
      
      mockPrismaClient.$transaction.mockResolvedValue(mockResult)

      const result = await transactionManager.execute(
        async (tx) => mockResult,
        { enableLogging: false }
      )

      expect(result.result).toEqual(mockResult)
    })
  })

  describe('Convenience Functions', () => {
    it('should work with withTransaction helper', async () => {
      const mockResult = { success: true }
      
      mockPrismaClient.$transaction.mockResolvedValue(mockResult)

      const result = await withTransaction(async (tx) => mockResult)

      expect(result.result).toEqual(mockResult)
    })
  })
})