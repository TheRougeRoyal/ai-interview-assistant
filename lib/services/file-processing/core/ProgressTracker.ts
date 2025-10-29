/**
 * Progress Tracking for File Processing
 * Provides real-time progress updates for long-running file processing operations
 */

import { EventEmitter } from 'events'
import { ProcessingJob, ProcessingEventType } from '../types'
import { getApiLogger } from '@/lib/logging'

/**
 * Progress update data
 */
export interface ProgressUpdate {
  jobId: string
  progress: number // 0-100
  stage: string // Current processing stage
  message?: string // Optional progress message
  bytesProcessed?: number
  totalBytes?: number
  timestamp: Date
}

/**
 * Progress callback function
 */
export type ProgressCallback = (update: ProgressUpdate) => void | Promise<void>

/**
 * Processing stages for progress tracking
 */
export enum ProcessingStage {
  VALIDATING = 'validating',
  READING = 'reading',
  PARSING = 'parsing',
  EXTRACTING = 'extracting',
  ANALYZING = 'analyzing',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed'
}

/**
 * Progress tracker for file processing operations
 */
export class ProgressTracker extends EventEmitter {
  private logger = getApiLogger()
  private callbacks = new Map<string, Set<ProgressCallback>>()
  private jobProgress = new Map<string, ProgressUpdate>()

  /**
   * Register a progress callback for a specific job
   */
  register(jobId: string, callback: ProgressCallback): void {
    if (!this.callbacks.has(jobId)) {
      this.callbacks.set(jobId, new Set())
    }
    this.callbacks.get(jobId)!.add(callback)

    this.logger.debug('Progress callback registered', { jobId })
  }

  /**
   * Unregister a progress callback
   */
  unregister(jobId: string, callback: ProgressCallback): void {
    const callbacks = this.callbacks.get(jobId)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.callbacks.delete(jobId)
      }
    }
  }

  /**
   * Update progress for a job
   */
  async updateProgress(update: ProgressUpdate): Promise<void> {
    // Store latest progress
    this.jobProgress.set(update.jobId, update)

    // Emit event
    this.emit('progress', update)

    // Call registered callbacks
    const callbacks = this.callbacks.get(update.jobId)
    if (callbacks) {
      const promises = Array.from(callbacks).map(async (callback) => {
        try {
          await callback(update)
        } catch (error) {
          this.logger.error('Progress callback error', error as Error, {
            jobId: update.jobId
          })
        }
      })

      await Promise.all(promises)
    }

    this.logger.debug('Progress updated', {
      jobId: update.jobId,
      progress: update.progress,
      stage: update.stage
    })
  }

  /**
   * Create a progress updater function for a job
   */
  createUpdater(jobId: string, totalStages: number = 6): (stage: ProcessingStage, progress?: number) => Promise<void> {
    let currentStage = 0
    const stageWeight = 100 / totalStages

    return async (stage: ProcessingStage, customProgress?: number) => {
      currentStage++
      
      // Calculate overall progress
      const baseProgress = (currentStage - 1) * stageWeight
      const stageProgress = customProgress !== undefined ? customProgress : 100
      const overallProgress = Math.min(100, Math.floor(baseProgress + (stageProgress / 100) * stageWeight))

      await this.updateProgress({
        jobId,
        progress: overallProgress,
        stage,
        timestamp: new Date()
      })
    }
  }

  /**
   * Create a progress updater for byte-based progress
   */
  createByteProgressUpdater(
    jobId: string,
    totalBytes: number,
    stage: ProcessingStage
  ): (bytesProcessed: number) => Promise<void> {
    return async (bytesProcessed: number) => {
      const progress = Math.min(100, Math.floor((bytesProcessed / totalBytes) * 100))

      await this.updateProgress({
        jobId,
        progress,
        stage,
        bytesProcessed,
        totalBytes,
        timestamp: new Date()
      })
    }
  }

  /**
   * Get current progress for a job
   */
  getProgress(jobId: string): ProgressUpdate | undefined {
    return this.jobProgress.get(jobId)
  }

  /**
   * Clear progress data for a job
   */
  clearProgress(jobId: string): void {
    this.jobProgress.delete(jobId)
    this.callbacks.delete(jobId)
    this.logger.debug('Progress data cleared', { jobId })
  }

  /**
   * Clear all progress data
   */
  clearAll(): void {
    this.jobProgress.clear()
    this.callbacks.clear()
    this.removeAllListeners()
    this.logger.debug('All progress data cleared')
  }
}

/**
 * Global progress tracker instance
 */
let progressTrackerInstance: ProgressTracker | null = null

/**
 * Get the global progress tracker instance
 */
export function getProgressTracker(): ProgressTracker {
  if (!progressTrackerInstance) {
    progressTrackerInstance = new ProgressTracker()
  }
  return progressTrackerInstance
}

/**
 * Reset the progress tracker (useful for testing)
 */
export function resetProgressTracker(): void {
  if (progressTrackerInstance) {
    progressTrackerInstance.clearAll()
    progressTrackerInstance = null
  }
}

/**
 * Progress tracking middleware for FileProcessingService
 */
export function createProgressMiddleware() {
  const tracker = getProgressTracker()

  return {
    name: 'ProgressTrackingMiddleware',

    async beforeProcess(job: ProcessingJob): Promise<ProcessingJob> {
      const updater = tracker.createUpdater(job.id)
      
      // Initial progress update
      await updater(ProcessingStage.VALIDATING, 0)

      return job
    },

    async afterProcess(job: ProcessingJob, result: any): Promise<any> {
      const updater = tracker.createUpdater(job.id)
      
      // Final progress update
      await updater(ProcessingStage.COMPLETED, 100)

      // Clear progress data after a delay
      setTimeout(() => {
        tracker.clearProgress(job.id)
      }, 5000)

      return result
    },

    async onError(job: ProcessingJob, error: any): Promise<any> {
      // Clear progress on error
      tracker.clearProgress(job.id)
      return error
    }
  }
}
