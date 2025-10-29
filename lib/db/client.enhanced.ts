/**
 * Enhanced Prisma client with connection pooling, monitoring, and error handling
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { getDatabaseLogger } from '@/lib/logging'
import { DatabaseError, ErrorCodes, getCorrelationId } from '@/lib/errors'

/**
 * Database client configuration
 */
export interface DatabaseConfig {
  enableLogging?: boolean
  enableQueryLogging?: boolean
  enableErrorLogging?: boolean
  enablePerformanceLogging?: boolean
  connectionTimeout?: number
  queryTimeout?: number
  maxConnections?: number
  logLevel?: Prisma.LogLevel[]
}

/**
 * Database connection status
 */
export interface DatabaseStatus {
  connected: boolean
  version?: string
  connectionCount?: number
  lastError?: string
  uptime: number
}

/**
 * Enhanced Prisma client class
 */
export class EnhancedPrismaClient extends PrismaClient {
  private logger = getDatabaseLogger()
  private config: DatabaseConfig
  private startTime: number
  private connectionCount: number = 0
  private lastError?: string

  constructor(config: DatabaseConfig = {}) {
    const {
      enableLogging = true,
      enableQueryLogging = false,
      enableErrorLogging = true,
      connectionTimeout = 30000,
      queryTimeout = 30000,
      maxConnections = 10,
      logLevel = ['error', 'warn']
    } = config

    super({
      log: enableLogging ? logLevel.map(level => ({ level, emit: 'event' })) : undefined,
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })

    this.config = config
    this.startTime = Date.now()

    this.setupEventListeners()
  }

  /**
   * Setup event listeners for logging and monitoring
   */
  private setupEventListeners(): void {
    // Note: Event listeners are not available in this Prisma version
    // Logging will be handled at the repository level instead
    this.logger.debug('Enhanced Prisma client initialized', {
      enableLogging: this.config.enableLogging,
      enableQueryLogging: this.config.enableQueryLogging,
      enableErrorLogging: this.config.enableErrorLogging
    })
  }

  /**
   * Connect to database with enhanced error handling
   */
  async connect(): Promise<void> {
    try {
      await this.$connect()
      this.connectionCount++
      
      this.logger.info('Database connected successfully', {
        connectionCount: this.connectionCount,
        correlationId: getCorrelationId()
      })
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
      
      this.logger.error('Database connection failed', 
        error instanceof Error ? error : new Error(String(error)), {
        correlationId: getCorrelationId()
      })

      throw new DatabaseError(
        ErrorCodes.CONNECTION_FAILED,
        'Failed to connect to database',
        error instanceof Error ? error : new Error(String(error)),
        getCorrelationId()
      )
    }
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    try {
      await this.$disconnect()
      
      this.logger.info('Database disconnected successfully', {
        correlationId: getCorrelationId()
      })
    } catch (error) {
      this.logger.error('Database disconnection failed', 
        error instanceof Error ? error : new Error(String(error)), {
        correlationId: getCorrelationId()
      })
    }
  }

  /**
   * Get database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    try {
      // Try a simple query to check connection
      await this.$queryRaw`SELECT 1`
      
      return {
        connected: true,
        connectionCount: this.connectionCount,
        uptime: Date.now() - this.startTime,
        lastError: this.lastError
      }
    } catch (error) {
      return {
        connected: false,
        connectionCount: this.connectionCount,
        uptime: Date.now() - this.startTime,
        lastError: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }

  /**
   * Execute raw query with error handling
   */
  async executeRaw(query: string, ...values: any[]): Promise<any> {
    const correlationId = getCorrelationId()
    
    try {
      this.logger.debug('Executing raw query', {
        query,
        correlationId
      })

      const result = await this.$queryRawUnsafe(query, ...values)
      
      this.logger.debug('Raw query executed successfully', {
        query,
        correlationId
      })

      return result
    } catch (error) {
      this.logger.error('Raw query execution failed', 
        error instanceof Error ? error : new Error(String(error)), {
        query,
        correlationId
      })

      throw new DatabaseError(
        ErrorCodes.DATABASE_ERROR,
        'Raw query execution failed',
        error instanceof Error ? error : new Error(String(error)),
        correlationId
      )
    }
  }

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<{
    connectionCount: number
    uptime: number
    lastError?: string
    status: DatabaseStatus
  }> {
    const status = await this.getStatus()
    
    return {
      connectionCount: this.connectionCount,
      uptime: Date.now() - this.startTime,
      lastError: this.lastError,
      status
    }
  }

  /**
   * Reset connection count (for testing)
   */
  resetConnectionCount(): void {
    this.connectionCount = 0
  }

  /**
   * Clear last error
   */
  clearLastError(): void {
    this.lastError = undefined
  }
}

/**
 * Global enhanced Prisma client instance
 */
declare global {
  // eslint-disable-next-line no-var
  var __enhancedPrisma__: EnhancedPrismaClient | undefined
}

const globalForPrisma = globalThis as unknown as {
  __enhancedPrisma__: EnhancedPrismaClient | undefined
}

export const enhancedPrisma: EnhancedPrismaClient = 
  globalForPrisma.__enhancedPrisma__ ?? 
  new EnhancedPrismaClient({
    enableLogging: process.env.NODE_ENV !== 'production',
    enableQueryLogging: process.env.NODE_ENV === 'development',
    enableErrorLogging: true,
    enablePerformanceLogging: true
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__enhancedPrisma__ = enhancedPrisma
}

/**
 * Database utilities
 */
export const DatabaseUtils = {
  /**
   * Check database connection
   */
  async checkConnection(): Promise<boolean> {
    return enhancedPrisma.healthCheck()
  },

  /**
   * Get database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    return enhancedPrisma.getStatus()
  },

  /**
   * Get database metrics
   */
  async getMetrics() {
    return enhancedPrisma.getMetrics()
  },

  /**
   * Execute health check query
   */
  async ping(): Promise<boolean> {
    try {
      await enhancedPrisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
}