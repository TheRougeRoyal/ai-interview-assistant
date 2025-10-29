/**
 * Base repository pattern implementation with transaction support and comprehensive error handling
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '../client'
import { 
  DatabaseError, 
  ErrorCodes, 
  getCorrelationId 
} from '@/lib/errors'
import { 
  getDatabaseLogger, 
  withDatabaseLogging, 
  measureAsync 
} from '@/lib/logging'

/**
 * Base repository interface defining common CRUD operations
 */
export interface BaseRepository<TModel, TCreateInput, TUpdateInput, TWhereInput = any> {
  // Basic CRUD operations
  create(data: TCreateInput): Promise<TModel>
  findById(id: string): Promise<TModel | null>
  findUnique(where: TWhereInput): Promise<TModel | null>
  findMany(options?: FindManyOptions<TWhereInput>): Promise<TModel[]>
  update(id: string, data: TUpdateInput): Promise<TModel>
  updateWhere(where: TWhereInput, data: TUpdateInput): Promise<TModel>
  delete(id: string): Promise<void>
  deleteWhere(where: TWhereInput): Promise<void>
  count(where?: TWhereInput): Promise<number>
  exists(where: TWhereInput): Promise<boolean>
  
  // Batch operations
  createMany(data: TCreateInput[]): Promise<TModel[]>
  updateMany(where: TWhereInput, data: TUpdateInput): Promise<number>
  deleteMany(where: TWhereInput): Promise<number>
  
  // Transaction support
  transaction<R>(fn: (tx: PrismaTransaction) => Promise<R>): Promise<R>
  
  // Pagination
  findManyPaginated(options: PaginationOptions<TWhereInput>): Promise<PaginatedResult<TModel>>
}

/**
 * Find many options interface
 */
export interface FindManyOptions<TWhereInput> {
  where?: TWhereInput
  orderBy?: any
  take?: number
  skip?: number
  cursor?: any
  include?: any
  select?: any
}

/**
 * Pagination options interface
 */
export interface PaginationOptions<TWhereInput> extends FindManyOptions<TWhereInput> {
  page?: number
  limit?: number
  cursor?: string
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
  page?: number
  limit?: number
  hasMore: boolean
  nextCursor?: string | null
  prevCursor?: string | null
}

/**
 * Transaction type
 */
export type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

/**
 * Repository configuration
 */
export interface RepositoryConfig {
  enableLogging?: boolean
  enablePerformanceTracking?: boolean
  defaultTimeout?: number
  retryAttempts?: number
}

/**
 * Abstract base repository implementation
 */
export abstract class AbstractBaseRepository<TModel, TCreateInput, TUpdateInput, TWhereInput = any> 
  implements BaseRepository<TModel, TCreateInput, TUpdateInput, TWhereInput> {
  
  protected readonly logger = getDatabaseLogger()
  protected readonly config: RepositoryConfig
  protected readonly modelName: string

  constructor(modelName: string, config: RepositoryConfig = {}) {
    this.modelName = modelName
    this.config = {
      enableLogging: true,
      enablePerformanceTracking: true,
      defaultTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      ...config
    }
  }

  /**
   * Get the Prisma delegate for this model
   */
  protected abstract getDelegate(client?: PrismaClient | PrismaTransaction): any

  /**
   * Transform database record to domain model
   */
  protected abstract toDomainModel(record: any): TModel

  /**
   * Transform create input to Prisma create input
   */
  protected abstract toPrismaCreateInput(input: TCreateInput): any

  /**
   * Transform update input to Prisma update input
   */
  protected abstract toPrismaUpdateInput(input: TUpdateInput): any

  /**
   * Handle database errors with proper error transformation
   */
  protected handleDatabaseError(error: any, operation: string): never {
    const correlationId = getCorrelationId()
    
    this.logger.error(`Database operation failed: ${operation}`, error, {
      modelName: this.modelName,
      operation,
      correlationId
    })

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new DatabaseError(
            ErrorCodes.DUPLICATE_RECORD,
            `Duplicate ${this.modelName.toLowerCase()} record`,
            error,
            correlationId
          )
        case 'P2025':
          throw new DatabaseError(
            ErrorCodes.RECORD_NOT_FOUND,
            `${this.modelName} not found`,
            error,
            correlationId
          )
        case 'P2003':
          throw new DatabaseError(
            ErrorCodes.CONSTRAINT_VIOLATION,
            'Foreign key constraint violation',
            error,
            correlationId
          )
        case 'P1001':
        case 'P1002':
          throw new DatabaseError(
            ErrorCodes.CONNECTION_FAILED,
            'Database connection failed',
            error,
            correlationId
          )
        default:
          throw new DatabaseError(
            ErrorCodes.DATABASE_ERROR,
            `Database error in ${operation}`,
            error,
            correlationId
          )
      }
    }

    throw new DatabaseError(
      ErrorCodes.DATABASE_ERROR,
      `Unexpected error in ${operation}`,
      error,
      correlationId
    )
  }

  /**
   * Execute operation with logging and error handling
   */
  protected async executeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    client?: PrismaClient | PrismaTransaction
  ): Promise<T> {
    const correlationId = getCorrelationId()
    
    if (this.config.enablePerformanceTracking) {
      return measureAsync(
        `${this.modelName}.${operation}`,
        async () => {
          try {
            const result = await fn()
            
            if (this.config.enableLogging) {
              this.logger.logDatabaseOperation({
                category: 'database' as any,
                message: `${this.modelName}.${operation} completed`,
                correlationId,
                operation: {
                  type: operation.includes('create') || operation.includes('update') || operation.includes('delete') ? 'mutation' : 'query',
                  model: this.modelName,
                  method: operation
                }
              })
            }
            
            return result
          } catch (error) {
            this.handleDatabaseError(error, operation)
          }
        },
        this.logger
      )
    } else {
      try {
        const result = await fn()
        
        if (this.config.enableLogging) {
          this.logger.logDatabaseOperation({
            category: 'database' as any,
            message: `${this.modelName}.${operation} completed`,
            correlationId,
            operation: {
              type: operation.includes('create') || operation.includes('update') || operation.includes('delete') ? 'mutation' : 'query',
              model: this.modelName,
              method: operation
            }
          })
        }
        
        return result
      } catch (error) {
        this.handleDatabaseError(error, operation)
      }
    }
  }

  /**
   * Create a new record
   */
  async create(data: TCreateInput): Promise<TModel> {
    return this.executeOperation('create', async () => {
      const delegate = this.getDelegate()
      const prismaInput = this.toPrismaCreateInput(data)
      const record = await delegate.create({ data: prismaInput })
      return this.toDomainModel(record)
    })
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<TModel | null> {
    return this.executeOperation('findById', async () => {
      const delegate = this.getDelegate()
      const record = await delegate.findUnique({ where: { id } })
      return record ? this.toDomainModel(record) : null
    })
  }

  /**
   * Find unique record by where clause
   */
  async findUnique(where: TWhereInput): Promise<TModel | null> {
    return this.executeOperation('findUnique', async () => {
      const delegate = this.getDelegate()
      const record = await delegate.findUnique({ where })
      return record ? this.toDomainModel(record) : null
    })
  }

  /**
   * Find many records
   */
  async findMany(options: FindManyOptions<TWhereInput> = {}): Promise<TModel[]> {
    return this.executeOperation('findMany', async () => {
      const delegate = this.getDelegate()
      const records = await delegate.findMany(options)
      return records.map((record: any) => this.toDomainModel(record))
    })
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: TUpdateInput): Promise<TModel> {
    return this.executeOperation('update', async () => {
      const delegate = this.getDelegate()
      const prismaInput = this.toPrismaUpdateInput(data)
      const record = await delegate.update({ 
        where: { id }, 
        data: prismaInput 
      })
      return this.toDomainModel(record)
    })
  }

  /**
   * Update record by where clause
   */
  async updateWhere(where: TWhereInput, data: TUpdateInput): Promise<TModel> {
    return this.executeOperation('updateWhere', async () => {
      const delegate = this.getDelegate()
      const prismaInput = this.toPrismaUpdateInput(data)
      const record = await delegate.update({ 
        where, 
        data: prismaInput 
      })
      return this.toDomainModel(record)
    })
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<void> {
    return this.executeOperation('delete', async () => {
      const delegate = this.getDelegate()
      await delegate.delete({ where: { id } })
    })
  }

  /**
   * Delete record by where clause
   */
  async deleteWhere(where: TWhereInput): Promise<void> {
    return this.executeOperation('deleteWhere', async () => {
      const delegate = this.getDelegate()
      await delegate.delete({ where })
    })
  }

  /**
   * Count records
   */
  async count(where?: TWhereInput): Promise<number> {
    return this.executeOperation('count', async () => {
      const delegate = this.getDelegate()
      return delegate.count({ where })
    })
  }

  /**
   * Check if record exists
   */
  async exists(where: TWhereInput): Promise<boolean> {
    const count = await this.count(where)
    return count > 0
  }

  /**
   * Create many records
   */
  async createMany(data: TCreateInput[]): Promise<TModel[]> {
    return this.executeOperation('createMany', async () => {
      const delegate = this.getDelegate()
      const prismaInputs = data.map(item => this.toPrismaCreateInput(item))
      
      // Prisma createMany doesn't return created records, so we need to create individually
      const results: TModel[] = []
      for (const input of prismaInputs) {
        const record = await delegate.create({ data: input })
        results.push(this.toDomainModel(record))
      }
      
      return results
    })
  }

  /**
   * Update many records
   */
  async updateMany(where: TWhereInput, data: TUpdateInput): Promise<number> {
    return this.executeOperation('updateMany', async () => {
      const delegate = this.getDelegate()
      const prismaInput = this.toPrismaUpdateInput(data)
      const result = await delegate.updateMany({ 
        where, 
        data: prismaInput 
      })
      return result.count
    })
  }

  /**
   * Delete many records
   */
  async deleteMany(where: TWhereInput): Promise<number> {
    return this.executeOperation('deleteMany', async () => {
      const delegate = this.getDelegate()
      const result = await delegate.deleteMany({ where })
      return result.count
    })
  }

  /**
   * Execute operations in a transaction
   */
  async transaction<R>(fn: (tx: PrismaTransaction) => Promise<R>): Promise<R> {
    const correlationId = getCorrelationId()
    
    return this.executeOperation('transaction', async () => {
      return prisma.$transaction(async (tx) => {
        this.logger.debug('Transaction started', { 
          modelName: this.modelName,
          correlationId 
        })
        
        try {
          const result = await fn(tx)
          
          this.logger.debug('Transaction completed successfully', { 
            modelName: this.modelName,
            correlationId 
          })
          
          return result
        } catch (error) {
          this.logger.error('Transaction failed', error instanceof Error ? error : new Error(String(error)), { 
            modelName: this.modelName,
            correlationId 
          })
          throw error
        }
      })
    })
  }

  /**
   * Find many records with pagination
   */
  async findManyPaginated(options: PaginationOptions<TWhereInput>): Promise<PaginatedResult<TModel>> {
    return this.executeOperation('findManyPaginated', async () => {
      const { page, limit, cursor, ...findOptions } = options
      const delegate = this.getDelegate()

      // Handle cursor-based pagination
      if (cursor) {
        const records = await delegate.findMany({
          ...findOptions,
          take: (limit || 20) + 1,
          skip: 1,
          cursor: { id: cursor }
        })

        const hasMore = records.length > (limit || 20)
        const items = records.slice(0, limit || 20).map((record: any) => this.toDomainModel(record))
        const nextCursor = hasMore ? records[limit || 20].id : null

        return {
          items,
          totalCount: -1, // Not calculated for cursor-based pagination
          hasMore,
          nextCursor,
          limit: limit || 20
        }
      }

      // Handle offset-based pagination
      const currentPage = page || 1
      const pageSize = limit || 20
      const skip = (currentPage - 1) * pageSize

      const [records, totalCount] = await Promise.all([
        delegate.findMany({
          ...findOptions,
          take: pageSize,
          skip
        }),
        delegate.count({ where: findOptions.where })
      ])

      const items = records.map((record: any) => this.toDomainModel(record))
      const hasMore = skip + pageSize < totalCount

      return {
        items,
        totalCount,
        page: currentPage,
        limit: pageSize,
        hasMore
      }
    })
  }
}