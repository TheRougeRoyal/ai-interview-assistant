/**
 * Tests for the base repository pattern
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { AbstractBaseRepository, type PrismaTransaction } from '../base'
import { MemoryTransport } from '@/lib/logging'

// Mock Prisma client
const mockPrismaClient = {
  $transaction: vi.fn(),
  testModel: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn()
  }
} as any

// Test model interfaces
interface TestModel {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

interface TestCreateInput {
  name: string
  email: string
}

interface TestUpdateInput {
  name?: string
  email?: string
}

interface TestWhereInput {
  id?: string
  email?: string
  name?: string
}

// Test repository implementation
class TestRepository extends AbstractBaseRepository<TestModel, TestCreateInput, TestUpdateInput, TestWhereInput> {
  constructor() {
    super('TestModel', {
      enableLogging: true,
      enablePerformanceTracking: false // Disable for testing
    })
  }

  protected getDelegate(client?: PrismaClient | PrismaTransaction) {
    return (client || mockPrismaClient).testModel
  }

  protected toDomainModel(record: any): TestModel {
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }
  }

  protected toPrismaCreateInput(input: TestCreateInput): any {
    return {
      name: input.name,
      email: input.email
    }
  }

  protected toPrismaUpdateInput(input: TestUpdateInput): any {
    return {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email })
    }
  }
}

describe('Base Repository Pattern', () => {
  let repository: TestRepository
  let memoryTransport: MemoryTransport

  beforeEach(() => {
    repository = new TestRepository()
    memoryTransport = new MemoryTransport()
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    memoryTransport.clear()
  })

  describe('Create Operations', () => {
    it('should create a new record', async () => {
      const mockRecord = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaClient.testModel.create.mockResolvedValue(mockRecord)

      const input: TestCreateInput = {
        name: 'John Doe',
        email: 'john@example.com'
      }

      const result = await repository.create(input)

      expect(mockPrismaClient.testModel.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com'
        }
      })

      expect(result).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: mockRecord.createdAt.toISOString(),
        updatedAt: mockRecord.updatedAt.toISOString()
      })
    })

    it('should create many records', async () => {
      const mockRecords = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrismaClient.testModel.create
        .mockResolvedValueOnce(mockRecords[0])
        .mockResolvedValueOnce(mockRecords[1])

      const inputs: TestCreateInput[] = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' }
      ]

      const results = await repository.createMany(inputs)

      expect(mockPrismaClient.testModel.create).toHaveBeenCalledTimes(2)
      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('John Doe')
      expect(results[1].name).toBe('Jane Doe')
    })
  })

  describe('Read Operations', () => {
    it('should find record by ID', async () => {
      const mockRecord = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaClient.testModel.findUnique.mockResolvedValue(mockRecord)

      const result = await repository.findById('1')

      expect(mockPrismaClient.testModel.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      })

      expect(result).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: mockRecord.createdAt.toISOString(),
        updatedAt: mockRecord.updatedAt.toISOString()
      })
    })

    it('should return null when record not found', async () => {
      mockPrismaClient.testModel.findUnique.mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })

    it('should find unique record by where clause', async () => {
      const mockRecord = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaClient.testModel.findUnique.mockResolvedValue(mockRecord)

      const result = await repository.findUnique({ email: 'john@example.com' })

      expect(mockPrismaClient.testModel.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })

      expect(result?.email).toBe('john@example.com')
    })

    it('should find many records', async () => {
      const mockRecords = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrismaClient.testModel.findMany.mockResolvedValue(mockRecords)

      const results = await repository.findMany({
        where: { name: 'Doe' },
        take: 10
      })

      expect(mockPrismaClient.testModel.findMany).toHaveBeenCalledWith({
        where: { name: 'Doe' },
        take: 10
      })

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('John Doe')
      expect(results[1].name).toBe('Jane Doe')
    })

    it('should count records', async () => {
      mockPrismaClient.testModel.count.mockResolvedValue(5)

      const count = await repository.count({ name: 'Doe' })

      expect(mockPrismaClient.testModel.count).toHaveBeenCalledWith({
        where: { name: 'Doe' }
      })

      expect(count).toBe(5)
    })

    it('should check if record exists', async () => {
      mockPrismaClient.testModel.count.mockResolvedValue(1)

      const exists = await repository.exists({ email: 'john@example.com' })

      expect(exists).toBe(true)
    })
  })

  describe('Update Operations', () => {
    it('should update record by ID', async () => {
      const mockRecord = {
        id: '1',
        name: 'John Updated',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaClient.testModel.update.mockResolvedValue(mockRecord)

      const result = await repository.update('1', { name: 'John Updated' })

      expect(mockPrismaClient.testModel.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'John Updated' }
      })

      expect(result.name).toBe('John Updated')
    })

    it('should update record by where clause', async () => {
      const mockRecord = {
        id: '1',
        name: 'John Updated',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrismaClient.testModel.update.mockResolvedValue(mockRecord)

      const result = await repository.updateWhere(
        { email: 'john@example.com' },
        { name: 'John Updated' }
      )

      expect(mockPrismaClient.testModel.update).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        data: { name: 'John Updated' }
      })

      expect(result.name).toBe('John Updated')
    })

    it('should update many records', async () => {
      mockPrismaClient.testModel.updateMany.mockResolvedValue({ count: 3 })

      const count = await repository.updateMany(
        { name: 'Doe' },
        { name: 'Updated' }
      )

      expect(mockPrismaClient.testModel.updateMany).toHaveBeenCalledWith({
        where: { name: 'Doe' },
        data: { name: 'Updated' }
      })

      expect(count).toBe(3)
    })
  })

  describe('Delete Operations', () => {
    it('should delete record by ID', async () => {
      mockPrismaClient.testModel.delete.mockResolvedValue({})

      await repository.delete('1')

      expect(mockPrismaClient.testModel.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      })
    })

    it('should delete record by where clause', async () => {
      mockPrismaClient.testModel.delete.mockResolvedValue({})

      await repository.deleteWhere({ email: 'john@example.com' })

      expect(mockPrismaClient.testModel.delete).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })
    })

    it('should delete many records', async () => {
      mockPrismaClient.testModel.deleteMany.mockResolvedValue({ count: 2 })

      const count = await repository.deleteMany({ name: 'Doe' })

      expect(mockPrismaClient.testModel.deleteMany).toHaveBeenCalledWith({
        where: { name: 'Doe' }
      })

      expect(count).toBe(2)
    })
  })

  describe('Pagination', () => {
    it('should handle cursor-based pagination', async () => {
      const mockRecords = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrismaClient.testModel.findMany.mockResolvedValue(mockRecords)

      const result = await repository.findManyPaginated({
        cursor: 'cursor-id',
        limit: 1
      })

      expect(mockPrismaClient.testModel.findMany).toHaveBeenCalledWith({
        take: 2, // limit + 1
        skip: 1,
        cursor: { id: 'cursor-id' }
      })

      expect(result.items).toHaveLength(1)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe('2')
    })

    it('should handle offset-based pagination', async () => {
      const mockRecords = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrismaClient.testModel.findMany.mockResolvedValue(mockRecords)
      mockPrismaClient.testModel.count.mockResolvedValue(10)

      const result = await repository.findManyPaginated({
        page: 2,
        limit: 5
      })

      expect(mockPrismaClient.testModel.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5 // (page - 1) * limit
      })

      expect(mockPrismaClient.testModel.count).toHaveBeenCalled()
      expect(result.totalCount).toBe(10)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)
      expect(result.hasMore).toBe(false)
    })
  })

  describe('Transaction Support', () => {
    it('should execute operations in transaction', async () => {
      const mockTx = {
        testModel: {
          create: vi.fn().mockResolvedValue({
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }

      mockPrismaClient.$transaction.mockImplementation(async (fn: any) => {
        return fn(mockTx)
      })

      const result = await repository.transaction(async (tx) => {
        return repository.create({ name: 'John Doe', email: 'john@example.com' })
      })

      expect(mockPrismaClient.$transaction).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle Prisma known request errors', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed'
      }

      mockPrismaClient.testModel.create.mockRejectedValue(prismaError)

      await expect(repository.create({
        name: 'John Doe',
        email: 'john@example.com'
      })).rejects.toThrow()
    })

    it('should handle generic errors', async () => {
      const genericError = new Error('Something went wrong')

      mockPrismaClient.testModel.create.mockRejectedValue(genericError)

      await expect(repository.create({
        name: 'John Doe',
        email: 'john@example.com'
      })).rejects.toThrow()
    })
  })
})