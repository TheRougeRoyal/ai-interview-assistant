/**
 * Job Monitoring and Health Check Utilities
 * Provides comprehensive monitoring for the file processing queue
 */

import { PrismaClient } from '@prisma/client'
import { ProcessingStatus } from '../types'
import { getApiLogger } from '@/lib/logging'

/**
 * Queue health status
 */
export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  details: {
    totalJobs: number
    pendingJobs: number
    processingJobs: number
    failedJobs: number
    stalledJobs: number
    avgProcessingTime: number
    oldestPendingJobAge: number | null // milliseconds
    errorRate: number // percentage
  }
  issues: string[]
  timestamp: Date
}

/**
 * Job statistics for monitoring
 */
export interface JobStatistics {
  total: number
  byStatus: Record<ProcessingStatus, number>
  byFormat: Record<string, number>
  byPriority: Record<string, number>
  successRate: number
  avgProcessingTime: number
  avgQueueTime: number
  throughput: {
    last1Hour: number
    last24Hours: number
    last7Days: number
  }
  errors: {
    total: number
    byCode: Record<string, number>
    recoverable: number
    nonRecoverable: number
  }
}

/**
 * Stalled job detection result
 */
export interface StalledJob {
  id: string
  fileName: string
  startedAt: Date
  duration: number // milliseconds
  status: ProcessingStatus
}

/**
 * Job monitor class
 */
export class JobMonitor {
  private logger = getApiLogger()
  private readonly stalledJobThreshold: number // milliseconds
  private readonly healthCheckInterval: number // milliseconds
  private healthCheckTimer: NodeJS.Timeout | null = null

  constructor(
    private prisma: PrismaClient,
    options?: {
      stalledJobThreshold?: number
      healthCheckInterval?: number
    }
  ) {
    this.stalledJobThreshold = options?.stalledJobThreshold || 5 * 60 * 1000 // 5 minutes
    this.healthCheckInterval = options?.healthCheckInterval || 60 * 1000 // 1 minute
  }

  /**
   * Get comprehensive job statistics
   */
  async getStatistics(): Promise<JobStatistics> {
    try {
      const now = Date.now()
      const oneHourAgo = new Date(now - 60 * 60 * 1000)
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

      // Total counts
      const [total, byStatus, byFormat, byPriority, avgTime, errors] = await Promise.all([
        this.prisma.processingJob.count(),
        this.getJobCountByStatus(),
        this.getJobCountByFormat(),
        this.getJobCountByPriority(),
        this.getAverageProcessingTime(),
        this.getErrorStatistics()
      ])

      // Throughput
      const throughput = {
        last1Hour: await this.prisma.processingJob.count({
          where: {
            completedAt: { gte: oneHourAgo },
            status: ProcessingStatus.COMPLETED
          }
        }),
        last24Hours: await this.prisma.processingJob.count({
          where: {
            completedAt: { gte: oneDayAgo },
            status: ProcessingStatus.COMPLETED
          }
        }),
        last7Days: await this.prisma.processingJob.count({
          where: {
            completedAt: { gte: sevenDaysAgo },
            status: ProcessingStatus.COMPLETED
          }
        })
      }

      // Success rate
      const completed = byStatus[ProcessingStatus.COMPLETED] || 0
      const failed = byStatus[ProcessingStatus.FAILED] || 0
      const successRate = completed + failed > 0
        ? (completed / (completed + failed)) * 100
        : 100

      // Average queue time
      const avgQueueTime = await this.getAverageQueueTime()

      return {
        total,
        byStatus,
        byFormat,
        byPriority,
        successRate,
        avgProcessingTime: avgTime,
        avgQueueTime,
        throughput,
        errors
      }
    } catch (error) {
      this.logger.error('Failed to get job statistics', error as Error)
      throw error
    }
  }

  /**
   * Check queue health
   */
  async checkHealth(): Promise<QueueHealth> {
    try {
      const stats = await this.getStatistics()
      const stalledJobs = await this.detectStalledJobs()
      const oldestPending = await this.getOldestPendingJob()

      const issues: string[] = []
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

      // Check for high error rate
      if (stats.successRate < 90) {
        issues.push(`Low success rate: ${stats.successRate.toFixed(1)}%`)
        status = 'degraded'
      }
      if (stats.successRate < 70) {
        status = 'unhealthy'
      }

      // Check for stalled jobs
      if (stalledJobs.length > 0) {
        issues.push(`${stalledJobs.length} stalled job(s) detected`)
        status = status === 'healthy' ? 'degraded' : status
      }
      if (stalledJobs.length > 5) {
        status = 'unhealthy'
      }

      // Check for old pending jobs
      if (oldestPending && oldestPending > 10 * 60 * 1000) { // 10 minutes
        issues.push(`Oldest pending job is ${Math.floor(oldestPending / 60000)} minutes old`)
        status = status === 'healthy' ? 'degraded' : status
      }

      // Check for high queue backlog
      if (stats.byStatus[ProcessingStatus.PENDING] > 100) {
        issues.push(`High queue backlog: ${stats.byStatus[ProcessingStatus.PENDING]} pending jobs`)
        status = status === 'healthy' ? 'degraded' : status
      }

      return {
        status,
        details: {
          totalJobs: stats.total,
          pendingJobs: stats.byStatus[ProcessingStatus.PENDING] || 0,
          processingJobs: stats.byStatus[ProcessingStatus.PROCESSING] || 0,
          failedJobs: stats.byStatus[ProcessingStatus.FAILED] || 0,
          stalledJobs: stalledJobs.length,
          avgProcessingTime: stats.avgProcessingTime,
          oldestPendingJobAge: oldestPending,
          errorRate: 100 - stats.successRate
        },
        issues,
        timestamp: new Date()
      }
    } catch (error) {
      this.logger.error('Health check failed', error as Error)
      return {
        status: 'unhealthy',
        details: {
          totalJobs: 0,
          pendingJobs: 0,
          processingJobs: 0,
          failedJobs: 0,
          stalledJobs: 0,
          avgProcessingTime: 0,
          oldestPendingJobAge: null,
          errorRate: 100
        },
        issues: ['Health check failed'],
        timestamp: new Date()
      }
    }
  }

  /**
   * Detect stalled jobs (processing for too long)
   */
  async detectStalledJobs(): Promise<StalledJob[]> {
    try {
      const threshold = new Date(Date.now() - this.stalledJobThreshold)

      const jobs = await this.prisma.processingJob.findMany({
        where: {
          status: ProcessingStatus.PROCESSING,
          startedAt: { lte: threshold }
        }
      })

      return jobs.map(job => ({
        id: job.id,
        fileName: job.fileName,
        startedAt: job.startedAt!,
        duration: Date.now() - job.startedAt!.getTime(),
        status: job.status as ProcessingStatus
      }))
    } catch (error) {
      this.logger.error('Failed to detect stalled jobs', error as Error)
      return []
    }
  }

  /**
   * Recover stalled jobs by resetting them to pending
   */
  async recoverStalledJobs(): Promise<number> {
    try {
      const stalledJobs = await this.detectStalledJobs()

      if (stalledJobs.length === 0) {
        return 0
      }

      const result = await this.prisma.processingJob.updateMany({
        where: {
          id: { in: stalledJobs.map(j => j.id) }
        },
        data: {
          status: ProcessingStatus.PENDING,
          startedAt: null,
          progress: 0
        }
      })

      this.logger.info('Recovered stalled jobs', { count: result.count })
      return result.count
    } catch (error) {
      this.logger.error('Failed to recover stalled jobs', error as Error)
      throw error
    }
  }

  /**
   * Start automatic health monitoring
   */
  startHealthMonitoring(onHealthCheck?: (health: QueueHealth) => void): void {
    if (this.healthCheckTimer) {
      this.logger.warn('Health monitoring already started')
      return
    }

    this.logger.info('Starting health monitoring', {
      interval: this.healthCheckInterval
    })

    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.checkHealth()
        
        if (health.status !== 'healthy') {
          this.logger.warn('Queue health degraded', {
            status: health.status,
            issues: health.issues
          })
        }

        if (onHealthCheck) {
          onHealthCheck(health)
        }

        // Auto-recover stalled jobs if unhealthy
        if (health.status === 'unhealthy' && health.details.stalledJobs > 0) {
          await this.recoverStalledJobs()
        }
      } catch (error) {
        this.logger.error('Health monitoring error', error as Error)
      }
    }, this.healthCheckInterval)
  }

  /**
   * Stop automatic health monitoring
   */
  stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
      this.logger.info('Stopped health monitoring')
    }
  }

  /**
   * Get job count by status
   */
  private async getJobCountByStatus(): Promise<Record<ProcessingStatus, number>> {
    const counts = await this.prisma.processingJob.groupBy({
      by: ['status'],
      _count: true
    })

    const result: any = {}
    for (const status of Object.values(ProcessingStatus)) {
      result[status] = 0
    }

    counts.forEach(item => {
      result[item.status as ProcessingStatus] = item._count
    })

    return result
  }

  /**
   * Get job count by format
   */
  private async getJobCountByFormat(): Promise<Record<string, number>> {
    const counts = await this.prisma.processingJob.groupBy({
      by: ['format'],
      _count: true
    })

    const result: Record<string, number> = {}
    counts.forEach(item => {
      result[item.format] = item._count
    })

    return result
  }

  /**
   * Get job count by priority
   */
  private async getJobCountByPriority(): Promise<Record<string, number>> {
    const counts = await this.prisma.processingJob.groupBy({
      by: ['priority'],
      _count: true
    })

    const result: Record<string, number> = {}
    counts.forEach(item => {
      result[item.priority] = item._count
    })

    return result
  }

  /**
   * Get average processing time
   */
  private async getAverageProcessingTime(): Promise<number> {
    const result = await this.prisma.processingJob.aggregate({
      where: {
        status: ProcessingStatus.COMPLETED,
        actualDuration: { not: null }
      },
      _avg: { actualDuration: true }
    })

    return result._avg.actualDuration || 0
  }

  /**
   * Get average queue time (time from creation to processing start)
   */
  private async getAverageQueueTime(): Promise<number> {
    const jobs = await this.prisma.processingJob.findMany({
      where: {
        startedAt: { not: null }
      },
      select: {
        createdAt: true,
        startedAt: true
      },
      take: 1000 // Sample last 1000 jobs
    })

    if (jobs.length === 0) {
      return 0
    }

    const totalQueueTime = jobs.reduce((sum, job) => {
      return sum + (job.startedAt!.getTime() - job.createdAt.getTime())
    }, 0)

    return totalQueueTime / jobs.length
  }

  /**
   * Get error statistics
   */
  private async getErrorStatistics() {
    const errorJobs = await this.prisma.processingJob.findMany({
      where: {
        status: ProcessingStatus.FAILED
      },
      select: {
        errorCode: true,
        errorRecoverable: true
      }
    })

    const byCode: Record<string, number> = {}
    let recoverable = 0
    let nonRecoverable = 0

    errorJobs.forEach(job => {
      if (job.errorCode) {
        byCode[job.errorCode] = (byCode[job.errorCode] || 0) + 1
      }
      if (job.errorRecoverable) {
        recoverable++
      } else {
        nonRecoverable++
      }
    })

    return {
      total: errorJobs.length,
      byCode,
      recoverable,
      nonRecoverable
    }
  }

  /**
   * Get oldest pending job age
   */
  private async getOldestPendingJob(): Promise<number | null> {
    const job = await this.prisma.processingJob.findFirst({
      where: { status: ProcessingStatus.PENDING },
      orderBy: { createdAt: 'asc' }
    })

    if (!job) {
      return null
    }

    return Date.now() - job.createdAt.getTime()
  }
}
