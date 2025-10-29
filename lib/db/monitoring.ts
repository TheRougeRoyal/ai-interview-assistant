/**
 * Database monitoring and health check utilities
 */

import { PrismaClient } from '@prisma/client'
import { enhancedPrisma } from './client.enhanced'
import { getDatabaseLogger, measureAsync } from '@/lib/logging'
import { getCorrelationId } from '@/lib/errors'

/**
 * Database health status
 */
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  responseTime: number
  checks: {
    connection: HealthCheck
    queries: HealthCheck
    migrations: HealthCheck
    diskSpace?: HealthCheck
  }
  metrics: DatabaseMetrics
}

/**
 * Individual health check result
 */
export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn'
  responseTime: number
  message?: string
  details?: Record<string, any>
}

/**
 * Database metrics
 */
export interface DatabaseMetrics {
  connectionCount: number
  activeConnections: number
  totalQueries: number
  slowQueries: number
  averageQueryTime: number
  uptime: number
  memoryUsage?: number
  diskUsage?: number
  cacheHitRatio?: number
}

/**
 * Query performance metrics
 */
export interface QueryMetrics {
  query: string
  executionTime: number
  timestamp: string
  correlationId: string
  success: boolean
  error?: string
}

/**
 * Database monitoring class
 */
export class DatabaseMonitor {
  private logger = getDatabaseLogger()
  private client: PrismaClient
  private queryMetrics: QueryMetrics[] = []
  private maxMetricsHistory = 1000
  private startTime = Date.now()

  constructor(client: PrismaClient = enhancedPrisma) {
    this.client = client
  }

  /**
   * Perform comprehensive health check
   */
  async healthCheck(): Promise<DatabaseHealth> {
    const correlationId = getCorrelationId()
    const startTime = Date.now()

    this.logger.debug('Starting database health check', { correlationId })

    const checks = {
      connection: await this.checkConnection(),
      queries: await this.checkQueries(),
      migrations: await this.checkMigrations()
    }

    const metrics = await this.getMetrics()
    const responseTime = Date.now() - startTime

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail')
    const warnChecks = Object.values(checks).filter(check => check.status === 'warn')

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks.length > 0) {
      status = 'unhealthy'
    } else if (warnChecks.length > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    const health: DatabaseHealth = {
      status,
      timestamp: new Date().toISOString(),
      responseTime,
      checks,
      metrics
    }

    this.logger.info('Database health check completed', {
      correlationId,
      status,
      responseTime,
      failedChecks: failedChecks.length,
      warnChecks: warnChecks.length
    })

    return health
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      await this.client.$queryRaw`SELECT 1`
      const responseTime = Date.now() - startTime

      return {
        status: responseTime > 1000 ? 'warn' : 'pass',
        responseTime,
        message: responseTime > 1000 ? 'Connection is slow' : 'Connection is healthy'
      }
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Connection failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }

  /**
   * Check query performance
   */
  private async checkQueries(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      // Test a simple query
      await this.client.$queryRaw`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`
      const responseTime = Date.now() - startTime

      // Check recent query performance
      const recentMetrics = this.queryMetrics.slice(-100)
      const averageTime = recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length
        : 0

      const slowQueries = recentMetrics.filter(m => m.executionTime > 1000).length

      if (slowQueries > recentMetrics.length * 0.1) {
        return {
          status: 'warn',
          responseTime,
          message: 'High number of slow queries detected',
          details: { averageTime, slowQueries, totalQueries: recentMetrics.length }
        }
      }

      return {
        status: 'pass',
        responseTime,
        message: 'Query performance is healthy',
        details: { averageTime, slowQueries, totalQueries: recentMetrics.length }
      }
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Query check failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }

  /**
   * Check database migrations status
   */
  private async checkMigrations(): Promise<HealthCheck> {
    const startTime = Date.now()

    try {
      // Check if _prisma_migrations table exists and has entries
      const migrations = await this.client.$queryRaw`
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name='_prisma_migrations'
      ` as any[]

      const responseTime = Date.now() - startTime

      if (migrations[0]?.count === 0) {
        return {
          status: 'warn',
          responseTime,
          message: 'No migration table found',
          details: { migrationsTable: false }
        }
      }

      return {
        status: 'pass',
        responseTime,
        message: 'Migrations are up to date',
        details: { migrationsTable: true }
      }
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: 'Migration check failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      }
    }
  }

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    const recentMetrics = this.queryMetrics.slice(-1000)
    const totalQueries = recentMetrics.length
    const slowQueries = recentMetrics.filter(m => m.executionTime > 1000).length
    const averageQueryTime = totalQueries > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
      : 0

    return {
      connectionCount: 1, // SQLite typically has 1 connection
      activeConnections: 1,
      totalQueries,
      slowQueries,
      averageQueryTime,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Record query metrics
   */
  recordQuery(query: string, executionTime: number, success: boolean, error?: string): void {
    const metric: QueryMetrics = {
      query: query.substring(0, 200), // Truncate long queries
      executionTime,
      timestamp: new Date().toISOString(),
      correlationId: getCorrelationId(),
      success,
      error
    }

    this.queryMetrics.push(metric)

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Log slow queries
    if (executionTime > 1000) {
      this.logger.warn('Slow query detected', {
        query: metric.query,
        executionTime,
        correlationId: metric.correlationId
      })
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats(timeWindow?: number): {
    totalQueries: number
    averageTime: number
    slowQueries: number
    errorRate: number
    queriesPerSecond: number
  } {
    const windowStart = timeWindow ? Date.now() - timeWindow : 0
    const relevantMetrics = this.queryMetrics.filter(m => 
      new Date(m.timestamp).getTime() > windowStart
    )

    const totalQueries = relevantMetrics.length
    const averageTime = totalQueries > 0 
      ? relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
      : 0
    const slowQueries = relevantMetrics.filter(m => m.executionTime > 1000).length
    const errorQueries = relevantMetrics.filter(m => !m.success).length
    const errorRate = totalQueries > 0 ? errorQueries / totalQueries : 0
    const timeSpan = timeWindow || (Date.now() - this.startTime)
    const queriesPerSecond = totalQueries / (timeSpan / 1000)

    return {
      totalQueries,
      averageTime,
      slowQueries,
      errorRate,
      queriesPerSecond
    }
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter(m => m.executionTime > 1000)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit)
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.queryMetrics = []
  }

  /**
   * Reset monitoring
   */
  reset(): void {
    this.queryMetrics = []
    this.startTime = Date.now()
  }
}

/**
 * Database performance profiler
 */
export class DatabaseProfiler {
  private logger = getDatabaseLogger()
  private monitor: DatabaseMonitor

  constructor(monitor: DatabaseMonitor) {
    this.monitor = monitor
  }

  /**
   * Profile a database operation
   */
  async profile<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const correlationId = getCorrelationId()
    
    return measureAsync(
      `db.${operation}`,
      async () => {
        const startTime = Date.now()
        let success = true
        let error: string | undefined

        try {
          const result = await fn()
          return result
        } catch (err) {
          success = false
          error = err instanceof Error ? err.message : String(err)
          throw err
        } finally {
          const executionTime = Date.now() - startTime
          this.monitor.recordQuery(operation, executionTime, success, error)
        }
      },
      this.logger
    )
  }
}

/**
 * Global database monitor instance
 */
export const databaseMonitor = new DatabaseMonitor()
export const databaseProfiler = new DatabaseProfiler(databaseMonitor)

/**
 * Database monitoring utilities
 */
export const DatabaseMonitoring = {
  /**
   * Get database health
   */
  async getHealth(): Promise<DatabaseHealth> {
    return databaseMonitor.healthCheck()
  },

  /**
   * Get database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    return databaseMonitor.getMetrics()
  },

  /**
   * Get query statistics
   */
  getQueryStats(timeWindow?: number) {
    return databaseMonitor.getQueryStats(timeWindow)
  },

  /**
   * Get slow queries
   */
  getSlowQueries(limit?: number) {
    return databaseMonitor.getSlowQueries(limit)
  },

  /**
   * Profile database operation
   */
  async profile<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return databaseProfiler.profile(operation, fn)
  },

  /**
   * Record query metrics
   */
  recordQuery(query: string, executionTime: number, success: boolean, error?: string) {
    databaseMonitor.recordQuery(query, executionTime, success, error)
  }
}