/**
 * System-wide health check utilities
 */

import { DatabaseMonitoring, type DatabaseHealth } from '@/lib/db/monitoring'
import { getLogger } from '@/lib/logging'
import { getCorrelationId } from '@/lib/errors'

/**
 * Overall system health status
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: DatabaseHealth
    memory: MemoryHealth
    disk?: DiskHealth
    external?: ExternalServicesHealth
  }
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    warningChecks: number
  }
}

/**
 * Memory health check
 */
export interface MemoryHealth {
  status: 'pass' | 'warn' | 'fail'
  usage: {
    used: number
    total: number
    percentage: number
  }
  heap: {
    used: number
    total: number
    percentage: number
  }
}

/**
 * Disk health check
 */
export interface DiskHealth {
  status: 'pass' | 'warn' | 'fail'
  usage: {
    used: number
    total: number
    percentage: number
  }
}

/**
 * External services health
 */
export interface ExternalServicesHealth {
  status: 'pass' | 'warn' | 'fail'
  services: {
    [serviceName: string]: {
      status: 'pass' | 'warn' | 'fail'
      responseTime: number
      message?: string
    }
  }
}

/**
 * System health checker
 */
export class SystemHealthChecker {
  private logger = getLogger()
  private startTime = Date.now()

  /**
   * Perform comprehensive system health check
   */
  async checkHealth(): Promise<SystemHealth> {
    const correlationId = getCorrelationId()
    
    this.logger.debug('Starting system health check', { correlationId })

    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory()
    ])

    const checks = {
      database,
      memory
    }

    // Calculate summary
    const allChecks = [
      database.status,
      memory.status,
      ...Object.values(database.checks).map(check => check.status)
    ]

    const summary = {
      totalChecks: allChecks.length,
      passedChecks: allChecks.filter(status => status === 'pass' || status === 'healthy').length,
      failedChecks: allChecks.filter(status => status === 'fail' || status === 'unhealthy').length,
      warningChecks: allChecks.filter(status => status === 'warn' || status === 'degraded').length
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (summary.failedChecks > 0) {
      status = 'unhealthy'
    } else if (summary.warningChecks > 0) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    const systemHealth: SystemHealth = {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - this.startTime,
      checks,
      summary
    }

    this.logger.info('System health check completed', {
      correlationId,
      status,
      summary
    })

    return systemHealth
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<DatabaseHealth> {
    try {
      return await DatabaseMonitoring.getHealth()
    } catch (error) {
      this.logger.error('Database health check failed', 
        error instanceof Error ? error : new Error(String(error))
      )
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: 0,
        checks: {
          connection: { status: 'fail', responseTime: 0, message: 'Health check failed' },
          queries: { status: 'fail', responseTime: 0, message: 'Health check failed' },
          migrations: { status: 'fail', responseTime: 0, message: 'Health check failed' }
        },
        metrics: {
          connectionCount: 0,
          activeConnections: 0,
          totalQueries: 0,
          slowQueries: 0,
          averageQueryTime: 0,
          uptime: 0
        }
      }
    }
  }

  /**
   * Check memory health
   */
  private async checkMemory(): Promise<MemoryHealth> {
    try {
      const memUsage = process.memoryUsage()
      const totalMemory = require('os').totalmem()
      const freeMemory = require('os').freemem()
      const usedMemory = totalMemory - freeMemory

      const memoryPercentage = (usedMemory / totalMemory) * 100
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100

      let status: 'pass' | 'warn' | 'fail'
      if (memoryPercentage > 90 || heapPercentage > 90) {
        status = 'fail'
      } else if (memoryPercentage > 80 || heapPercentage > 80) {
        status = 'warn'
      } else {
        status = 'pass'
      }

      return {
        status,
        usage: {
          used: usedMemory,
          total: totalMemory,
          percentage: memoryPercentage
        },
        heap: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          percentage: heapPercentage
        }
      }
    } catch (error) {
      this.logger.error('Memory health check failed', 
        error instanceof Error ? error : new Error(String(error))
      )
      
      return {
        status: 'fail',
        usage: { used: 0, total: 0, percentage: 0 },
        heap: { used: 0, total: 0, percentage: 0 }
      }
    }
  }

  /**
   * Check external services health
   */
  private async checkExternalServices(): Promise<ExternalServicesHealth> {
    const services: ExternalServicesHealth['services'] = {}

    // Check OpenAI API if configured
    if (process.env.OPENAI_API_KEY) {
      services.openai = await this.checkOpenAI()
    }

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status)
    let status: 'pass' | 'warn' | 'fail'
    
    if (serviceStatuses.some(s => s === 'fail')) {
      status = 'fail'
    } else if (serviceStatuses.some(s => s === 'warn')) {
      status = 'warn'
    } else {
      status = 'pass'
    }

    return { status, services }
  }

  /**
   * Check OpenAI API health
   */
  private async checkOpenAI(): Promise<{ status: 'pass' | 'warn' | 'fail'; responseTime: number; message?: string }> {
    const startTime = Date.now()
    
    try {
      // Simple API call to check if OpenAI is accessible
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return {
          status: responseTime > 2000 ? 'warn' : 'pass',
          responseTime,
          message: responseTime > 2000 ? 'Slow response' : 'Service is healthy'
        }
      } else {
        return {
          status: 'fail',
          responseTime,
          message: `HTTP ${response.status}: ${response.statusText}`
        }
      }
    } catch (error) {
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reset health checker
   */
  reset(): void {
    this.startTime = Date.now()
  }
}

/**
 * Global system health checker instance
 */
export const systemHealthChecker = new SystemHealthChecker()

/**
 * System health utilities
 */
export const SystemHealth = {
  /**
   * Get system health
   */
  async getHealth(): Promise<SystemHealth> {
    return systemHealthChecker.checkHealth()
  },

  /**
   * Get simple health status
   */
  async getStatus(): Promise<{ status: string; timestamp: string }> {
    const health = await systemHealthChecker.checkHealth()
    return {
      status: health.status,
      timestamp: health.timestamp
    }
  },

  /**
   * Check if system is healthy
   */
  async isHealthy(): Promise<boolean> {
    const health = await systemHealthChecker.checkHealth()
    return health.status === 'healthy'
  }
}