/**
 * Database-backed Processing Job Queue with Prisma
 * Provides persistent job tracking and retry mechanisms
 */

import { PrismaClient } from '@prisma/client'
import {
  ProcessingJobQueue as IProcessingJobQueue,
  ProcessingJob,
  ProcessingStatus,
  ProcessingOptions,
  ProcessingResult,
  ProcessingError
} from '../types'
import { getApiLogger } from '@/lib/logging'

/**
 * Retry strategy configuration
 */
interface RetryConfig {
  maxRetries: number
  initialDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  jitterFactor: number // 0-1, adds randomness to prevent thundering herd
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 1 minute
  backoffMultiplier: 2,
  jitterFactor: 0.1
}

/**
 * Persistent job queue using Prisma
 */
export class PrismaProcessingJobQueue implements IProcessingJobQueue {
  private logger = getApiLogger()
  private retryConfig: RetryConfig

  constructor(
    private prisma: PrismaClient,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  /**
   * Add job to queue
   */
  async add(job: ProcessingJob): Promise<string> {
    try {
      const dbJob = await this.prisma.processingJob.create({
        data: {
          id: job.id,
          fileId: job.fileId,
          fileName: job.fileName,
          fileSize: job.fileSize,
          format: job.format,
          status: job.status,
          progress: job.progress,
          optionsJson: JSON.stringify(job.options),
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
          priority: job.priority,
          estimatedDuration: job.estimatedDuration,
          createdAt: job.createdAt
        }
      })

      this.logger.debug('Job added to database queue', {
        jobId: dbJob.id,
        fileName: dbJob.fileName,
        format: dbJob.format,
        priority: dbJob.priority
      })

      return dbJob.id
    } catch (error) {
      this.logger.error('Failed to add job to queue', error as Error, { jobId: job.id })
      throw error
    }
  }

  /**
   * Get job from queue
   */
  async get(jobId: string): Promise<ProcessingJob | null> {
    try {
      const dbJob = await this.prisma.processingJob.findUnique({
        where: { id: jobId }
      })

      if (!dbJob) {
        return null
      }

      return this.dbJobToProcessingJob(dbJob)
    } catch (error) {
      this.logger.error('Failed to get job from queue', error as Error, { jobId })
      throw error
    }
  }

  /**
   * Update job in queue
   */
  async update(jobId: string, updates: Partial<ProcessingJob>): Promise<void> {
    try {
      const updateData: any = {}

      if (updates.status) updateData.status = updates.status
      if (updates.progress !== undefined) updateData.progress = updates.progress
      if (updates.result) {
        updateData.resultJson = JSON.stringify(updates.result)
        updateData.extractedText = updates.result.extractedText
        updateData.metadataJson = updates.result.metadata ? JSON.stringify(updates.result.metadata) : null
        updateData.actualDuration = updates.result.processingTime
      }
      if (updates.error) {
        updateData.errorCode = updates.error.code
        updateData.errorMessage = updates.error.message
        updateData.errorRecoverable = updates.error.recoverable
      }
      if (updates.startedAt) updateData.startedAt = updates.startedAt
      if (updates.completedAt) updateData.completedAt = updates.completedAt
      if (updates.retryCount !== undefined) updateData.retryCount = updates.retryCount

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: updateData
      })

      this.logger.debug('Job updated in queue', {
        jobId,
        updates: Object.keys(updateData)
      })
    } catch (error) {
      this.logger.error('Failed to update job', error as Error, { jobId })
      throw error
    }
  }

  /**
   * Remove job from queue
   */
  async remove(jobId: string): Promise<boolean> {
    try {
      await this.prisma.processingJob.delete({
        where: { id: jobId }
      })

      this.logger.debug('Job removed from queue', { jobId })
      return true
    } catch (error) {
      if ((error as any).code === 'P2025') {
        // Record not found
        return false
      }
      this.logger.error('Failed to remove job', error as Error, { jobId })
      throw error
    }
  }

  /**
   * List jobs by status
   */
  async list(status?: ProcessingStatus): Promise<ProcessingJob[]> {
    try {
      const where = status ? { status } : undefined

      const dbJobs = await this.prisma.processingJob.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      })

      return dbJobs.map(dbJob => this.dbJobToProcessingJob(dbJob))
    } catch (error) {
      this.logger.error('Failed to list jobs', error as Error, { status })
      throw error
    }
  }

  /**
   * Clear all jobs (use with caution)
   */
  async clear(): Promise<void> {
    try {
      const result = await this.prisma.processingJob.deleteMany({})
      this.logger.info('Job queue cleared', { deletedCount: result.count })
    } catch (error) {
      this.logger.error('Failed to clear job queue', error as Error)
      throw error
    }
  }

  /**
   * Get next job to process (priority-based with retry scheduling)
   */
  async getNextJob(): Promise<ProcessingJob | null> {
    try {
      // Get pending jobs or failed jobs ready for retry
      const now = new Date()
      
      const job = await this.prisma.processingJob.findFirst({
        where: {
          OR: [
            { status: ProcessingStatus.PENDING },
            {
              status: ProcessingStatus.FAILED,
              errorRecoverable: true,
              retryCount: { lt: this.prisma.processingJob.fields.maxRetries },
              nextRetryAt: { lte: now }
            }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      })

      if (!job) {
        return null
      }

      return this.dbJobToProcessingJob(job)
    } catch (error) {
      this.logger.error('Failed to get next job', error as Error)
      throw error
    }
  }

  /**
   * Schedule retry for a failed job with exponential backoff
   */
  async scheduleRetry(jobId: string): Promise<boolean> {
    try {
      const job = await this.prisma.processingJob.findUnique({
        where: { id: jobId }
      })

      if (!job) {
        this.logger.warn('Job not found for retry scheduling', { jobId })
        return false
      }

      // Check if job can be retried
      if (job.retryCount >= job.maxRetries) {
        this.logger.warn('Job exceeded max retries', {
          jobId,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries
        })
        return false
      }

      if (!job.errorRecoverable) {
        this.logger.warn('Job has non-recoverable error', { jobId })
        return false
      }

      // Calculate next retry time with exponential backoff and jitter
      const delay = this.calculateRetryDelay(job.retryCount)
      const nextRetryAt = new Date(Date.now() + delay)

      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          retryCount: job.retryCount + 1,
          lastRetryAt: new Date(),
          nextRetryAt,
          status: ProcessingStatus.PENDING // Reset to pending for retry
        }
      })

      this.logger.info('Job scheduled for retry', {
        jobId,
        retryCount: job.retryCount + 1,
        nextRetryAt,
        delayMs: delay
      })

      return true
    } catch (error) {
      this.logger.error('Failed to schedule retry', error as Error, { jobId })
      throw error
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, maxDelay, backoffMultiplier, jitterFactor } = this.retryConfig

    // Exponential backoff: delay = initialDelay * (backoffMultiplier ^ retryCount)
    let delay = initialDelay * Math.pow(backoffMultiplier, retryCount)

    // Cap at max delay
    delay = Math.min(delay, maxDelay)

    // Add jitter to prevent thundering herd
    const jitter = delay * jitterFactor * (Math.random() * 2 - 1) // Random between -jitter and +jitter
    delay += jitter

    return Math.floor(delay)
  }

  /**
   * Cleanup old completed jobs
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge)

      const result = await this.prisma.processingJob.deleteMany({
        where: {
          status: {
            in: [ProcessingStatus.COMPLETED, ProcessingStatus.CANCELLED]
          },
          completedAt: {
            lte: cutoffDate
          }
        }
      })

      if (result.count > 0) {
        this.logger.info('Cleaned up old jobs', { deletedCount: result.count })
      }

      return result.count
    } catch (error) {
      this.logger.error('Failed to cleanup old jobs', error as Error)
      throw error
    }
  }

  /**
   * Cleanup failed jobs that exceeded max retries
   */
  async cleanupFailedJobs(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge)

      const result = await this.prisma.processingJob.deleteMany({
        where: {
          status: ProcessingStatus.FAILED,
          OR: [
            { retryCount: { gte: this.prisma.processingJob.fields.maxRetries } },
            { errorRecoverable: false }
          ],
          updatedAt: {
            lte: cutoffDate
          }
        }
      })

      if (result.count > 0) {
        this.logger.info('Cleaned up failed jobs', { deletedCount: result.count })
      }

      return result.count
    } catch (error) {
      this.logger.error('Failed to cleanup failed jobs', error as Error)
      throw error
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      const [total, pending, processing, completed, failed, cancelled] = await Promise.all([
        this.prisma.processingJob.count(),
        this.prisma.processingJob.count({ where: { status: ProcessingStatus.PENDING } }),
        this.prisma.processingJob.count({ where: { status: ProcessingStatus.PROCESSING } }),
        this.prisma.processingJob.count({ where: { status: ProcessingStatus.COMPLETED } }),
        this.prisma.processingJob.count({ where: { status: ProcessingStatus.FAILED } }),
        this.prisma.processingJob.count({ where: { status: ProcessingStatus.CANCELLED } })
      ])

      // Get oldest pending job
      const oldestPending = await this.prisma.processingJob.findFirst({
        where: { status: ProcessingStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      })

      // Get average processing time for completed jobs
      const avgProcessingTime = await this.prisma.processingJob.aggregate({
        where: {
          status: ProcessingStatus.COMPLETED,
          actualDuration: { not: null }
        },
        _avg: { actualDuration: true }
      })

      return {
        total,
        byStatus: {
          [ProcessingStatus.PENDING]: pending,
          [ProcessingStatus.PROCESSING]: processing,
          [ProcessingStatus.COMPLETED]: completed,
          [ProcessingStatus.FAILED]: failed,
          [ProcessingStatus.CANCELLED]: cancelled
        },
        oldestPendingJob: oldestPending?.createdAt?.getTime() || null,
        averageProcessingTime: avgProcessingTime._avg.actualDuration || 0
      }
    } catch (error) {
      this.logger.error('Failed to get queue stats', error as Error)
      throw error
    }
  }

  /**
   * Convert database job to ProcessingJob type
   */
  private dbJobToProcessingJob(dbJob: any): ProcessingJob {
    const job: ProcessingJob = {
      id: dbJob.id,
      fileId: dbJob.fileId,
      fileName: dbJob.fileName,
      fileSize: dbJob.fileSize,
      format: dbJob.format as any,
      options: dbJob.optionsJson ? JSON.parse(dbJob.optionsJson) : {},
      status: dbJob.status as ProcessingStatus,
      progress: dbJob.progress,
      retryCount: dbJob.retryCount,
      maxRetries: dbJob.maxRetries,
      priority: dbJob.priority as any,
      createdAt: dbJob.createdAt,
      startedAt: dbJob.startedAt || undefined,
      completedAt: dbJob.completedAt || undefined,
      estimatedDuration: dbJob.estimatedDuration || undefined,
      actualDuration: dbJob.actualDuration || undefined
    }

    // Add result if available
    if (dbJob.resultJson) {
      job.result = JSON.parse(dbJob.resultJson)
    }

    // Add error if available
    if (dbJob.errorCode) {
      job.error = {
        code: dbJob.errorCode,
        message: dbJob.errorMessage || 'Unknown error',
        recoverable: dbJob.errorRecoverable
      }
    }

    return job
  }
}
