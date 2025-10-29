/**
 * Processing job queue implementation
 */

import { 
  ProcessingJobQueue as IProcessingJobQueue,
  ProcessingJob,
  ProcessingStatus 
} from '../types'
import { getApiLogger } from '@/lib/logging'

/**
 * In-memory processing job queue implementation
 */
export class ProcessingJobQueue implements IProcessingJobQueue {
  private jobs = new Map<string, ProcessingJob>()
  private logger = getApiLogger()

  /**
   * Add job to queue
   */
  async add(job: ProcessingJob): Promise<string> {
    this.jobs.set(job.id, { ...job })
    
    this.logger.debug('Job added to queue', {
      jobId: job.id,
      fileName: job.fileName,
      format: job.format,
      priority: job.priority
    })
    
    return job.id
  }

  /**
   * Get job from queue
   */
  async get(jobId: string): Promise<ProcessingJob | null> {
    return this.jobs.get(jobId) || null
  }

  /**
   * Update job in queue
   */
  async update(jobId: string, updates: Partial<ProcessingJob>): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    const updatedJob = { ...job, ...updates }
    this.jobs.set(jobId, updatedJob)
    
    this.logger.debug('Job updated in queue', {
      jobId,
      updates: Object.keys(updates)
    })
  }

  /**
   * Remove job from queue
   */
  async remove(jobId: string): Promise<boolean> {
    const existed = this.jobs.has(jobId)
    this.jobs.delete(jobId)
    
    if (existed) {
      this.logger.debug('Job removed from queue', { jobId })
    }
    
    return existed
  }

  /**
   * List jobs by status
   */
  async list(status?: ProcessingStatus): Promise<ProcessingJob[]> {
    const allJobs = Array.from(this.jobs.values())
    
    if (status) {
      return allJobs.filter(job => job.status === status)
    }
    
    return allJobs
  }

  /**
   * Clear all jobs
   */
  async clear(): Promise<void> {
    const jobCount = this.jobs.size
    this.jobs.clear()
    
    this.logger.info('Job queue cleared', { clearedJobs: jobCount })
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values())
    
    const byStatus = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {} as Record<ProcessingStatus, number>)

    const byFormat = jobs.reduce((acc, job) => {
      acc[job.format] = (acc[job.format] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: jobs.length,
      byStatus,
      byFormat,
      oldestJob: jobs.length > 0 
        ? Math.min(...jobs.map(j => j.createdAt.getTime()))
        : null
    }
  }

  /**
   * Get next job to process (priority-based)
   */
  async getNextJob(): Promise<ProcessingJob | null> {
    const pendingJobs = await this.list(ProcessingStatus.PENDING)
    
    if (pendingJobs.length === 0) {
      return null
    }

    // Sort by priority and creation time
    const priorityOrder = { high: 3, normal: 2, low: 1 }
    
    pendingJobs.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      
      // Same priority, sort by creation time (FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return pendingJobs[0]
  }

  /**
   * Cleanup old completed jobs
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [jobId, job] of this.jobs.entries()) {
      const isOld = (now - job.createdAt.getTime()) > maxAge
      const isCompleted = job.status === ProcessingStatus.COMPLETED || 
                         job.status === ProcessingStatus.FAILED ||
                         job.status === ProcessingStatus.CANCELLED
      
      if (isOld && isCompleted) {
        this.jobs.delete(jobId)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.info('Cleaned up old jobs', { cleanedCount })
    }
    
    return cleanedCount
  }
}

/**
 * Database-backed processing job queue (for production use)
 */
export class DatabaseProcessingJobQueue implements IProcessingJobQueue {
  private logger = getApiLogger()

  constructor(private db: any) {} // Would be Prisma client in real implementation

  async add(job: ProcessingJob): Promise<string> {
    // In a real implementation, this would use Prisma to store the job
    this.logger.debug('Adding job to database queue', { jobId: job.id })
    
    // Mock implementation
    return job.id
  }

  async get(jobId: string): Promise<ProcessingJob | null> {
    // In a real implementation, this would query the database
    this.logger.debug('Getting job from database queue', { jobId })
    
    // Mock implementation
    return null
  }

  async update(jobId: string, updates: Partial<ProcessingJob>): Promise<void> {
    // In a real implementation, this would update the database record
    this.logger.debug('Updating job in database queue', { jobId, updates: Object.keys(updates) })
  }

  async remove(jobId: string): Promise<boolean> {
    // In a real implementation, this would delete from database
    this.logger.debug('Removing job from database queue', { jobId })
    return true
  }

  async list(status?: ProcessingStatus): Promise<ProcessingJob[]> {
    // In a real implementation, this would query the database
    this.logger.debug('Listing jobs from database queue', { status })
    return []
  }

  async clear(): Promise<void> {
    // In a real implementation, this would clear the database table
    this.logger.info('Clearing database job queue')
  }
}