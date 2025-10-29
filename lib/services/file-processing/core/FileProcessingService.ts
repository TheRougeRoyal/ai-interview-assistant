/**
 * Core file processing service implementation
 */

import { EventEmitter } from 'events'
import { 
  FileProcessingService as IFileProcessingService,
  FileProcessor,
  ProcessingOptions,
  ProcessingResult,
  FileValidationResult,
  FileFormat,
  ProcessingStatus,
  ProcessingJob,
  ProcessingError,
  ProcessingEventType,
  ProcessingEvent,
  ProcessingEventListener,
  FallbackStrategy,
  ProcessingMiddleware,
  FileProcessingConfig,
  ProcessingStats
} from '../types'
import { ProcessingJobQueue } from './ProcessingJobQueue'
import { FileValidator } from './FileValidator'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * Main file processing service implementation
 */
export class FileProcessingService extends EventEmitter implements IFileProcessingService {
  private processors = new Map<FileFormat, FileProcessor[]>()
  private fallbackStrategies: FallbackStrategy[] = []
  private middleware: ProcessingMiddleware[] = []
  private eventListeners: ProcessingEventListener[] = []
  private jobQueue: ProcessingJobQueue
  private validator: FileValidator
  private logger = getApiLogger()
  private activeJobs = new Map<string, ProcessingJob>()
  private stats = {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalProcessingTime: 0
  }

  constructor(
    private config: FileProcessingConfig,
    jobQueue?: ProcessingJobQueue
  ) {
    super()
    this.jobQueue = jobQueue || new ProcessingJobQueue()
    this.validator = new FileValidator(config)
    
    this.logger.info('File processing service initialized', {
      maxFileSize: config.maxFileSize,
      maxConcurrentJobs: config.maxConcurrentJobs,
      supportedFormats: config.supportedFormats
    })
  }

  /**
   * Register a file processor
   */
  registerProcessor(processor: FileProcessor): void {
    for (const format of processor.supportedFormats) {
      if (!this.processors.has(format)) {
        this.processors.set(format, [])
      }
      this.processors.get(format)!.push(processor)
    }

    this.logger.info('File processor registered', {
      processorName: processor.name,
      version: processor.version,
      supportedFormats: processor.supportedFormats
    })
  }

  /**
   * Register a fallback strategy
   */
  registerFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy)
    this.logger.info('Fallback strategy registered', { strategyName: strategy.name })
  }

  /**
   * Register middleware
   */
  registerMiddleware(middleware: ProcessingMiddleware): void {
    this.middleware.push(middleware)
    this.logger.info('Processing middleware registered', { middlewareName: middleware.name })
  }

  /**
   * Add event listener
   */
  addEventListener(listener: ProcessingEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: ProcessingEventListener): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  /**
   * Process a single file
   */
  async processFile(file: File | Buffer, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const correlationId = generateCorrelationId()
    const startTime = Date.now()

    try {
      // Validate file first
      const validation = await this.validateFile(file)
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
      }

      // Create processing job
      const job = await this.createProcessingJob(file, validation.metadata.format, options)
      
      this.logger.info('Starting file processing', {
        jobId: job.id,
        fileName: job.fileName,
        format: job.format,
        correlationId
      })

      // Emit job created event
      await this.emitEvent({
        type: ProcessingEventType.JOB_CREATED,
        jobId: job.id,
        timestamp: new Date(),
        data: { fileName: job.fileName, format: job.format }
      })

      // Add to active jobs
      this.activeJobs.set(job.id, job)
      this.stats.totalJobs++

      // Apply before-process middleware
      let processedJob = job
      for (const middleware of this.middleware) {
        if (middleware.beforeProcess) {
          processedJob = await middleware.beforeProcess(processedJob)
        }
      }

      // Update job status
      await this.updateJobStatus(job.id, ProcessingStatus.PROCESSING)
      
      // Emit job started event
      await this.emitEvent({
        type: ProcessingEventType.JOB_STARTED,
        jobId: job.id,
        timestamp: new Date()
      })

      // Process the file
      let result = await this.executeProcessing(file, processedJob, options)

      // Apply after-process middleware
      for (const middleware of this.middleware) {
        if (middleware.afterProcess) {
          result = await middleware.afterProcess(processedJob, result)
        }
      }

      // Update statistics
      const processingTime = Date.now() - startTime
      this.stats.completedJobs++
      this.stats.totalProcessingTime += processingTime

      // Update job with result
      await this.updateJobResult(job.id, result)
      
      // Remove from active jobs
      this.activeJobs.delete(job.id)

      // Emit completion event
      await this.emitEvent({
        type: ProcessingEventType.JOB_COMPLETED,
        jobId: job.id,
        timestamp: new Date(),
        data: { processingTime, success: true }
      })

      this.logger.info('File processing completed', {
        jobId: job.id,
        processingTime,
        correlationId
      })

      return result

    } catch (error) {
  const processingError = this.createProcessingError(error, correlationId)
      
  this.logger.error('File processing failed', new Error(processingError.message), { correlationId, details: processingError })
      
      // Try fallback strategies
      const fallbackResult = await this.tryFallbackStrategies(file, options, processingError)
      if (fallbackResult) {
        return fallbackResult
      }

      this.stats.failedJobs++
      throw processingError
    }
  }

  /**
   * Get processing status for a job
   */
  async getProcessingStatus(jobId: string): Promise<ProcessingResult> {
    const job = await this.jobQueue.get(jobId)
    if (!job) {
      throw new Error(`Job not found: ${jobId}`)
    }

    if (job.result) {
      return job.result
    }

    // Return current status
    return {
      id: jobId,
      status: job.status,
      progress: job.progress,
      startedAt: job.startedAt || job.createdAt,
      completedAt: job.completedAt
    }
  }

  /**
   * Cancel processing job
   */
  async cancelProcessing(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId)
    if (!job) {
      return false
    }

    try {
      await this.updateJobStatus(jobId, ProcessingStatus.CANCELLED)
      this.activeJobs.delete(jobId)

      await this.emitEvent({
        type: ProcessingEventType.JOB_CANCELLED,
        jobId,
        timestamp: new Date()
      })

      this.logger.info('Processing job cancelled', { jobId })
      return true
    } catch (error) {
      this.logger.error('Failed to cancel processing job', error as Error, { jobId })
      return false
    }
  }

  /**
   * Validate file
   */
  async validateFile(file: File | Buffer): Promise<FileValidationResult> {
    return this.validator.validate(file)
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): FileFormat[] {
    return Array.from(this.processors.keys())
  }

  /**
   * Process multiple files in batch
   */
  async processBatch(files: Array<File | Buffer>, options: ProcessingOptions = {}): Promise<ProcessingResult[]> {
    const batchId = generateCorrelationId()
    
    this.logger.info('Starting batch processing', {
      batchId,
      fileCount: files.length
    })

    await this.emitEvent({
      type: ProcessingEventType.BATCH_STARTED,
      jobId: batchId,
      timestamp: new Date(),
      data: { fileCount: files.length }
    })

    const results: ProcessingResult[] = []
    const concurrency = Math.min(this.config.maxConcurrentJobs, files.length)
    
    // Process files in batches with concurrency control
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const batchPromises = batch.map(file => 
        this.processFile(file, options).catch(error => ({
          id: generateCorrelationId(),
          status: ProcessingStatus.FAILED,
          error: this.createProcessingError(error),
          startedAt: new Date()
        }))
      )
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    await this.emitEvent({
      type: ProcessingEventType.BATCH_COMPLETED,
      jobId: batchId,
      timestamp: new Date(),
      data: { 
        fileCount: files.length,
        successCount: results.filter(r => r.status === ProcessingStatus.COMPLETED).length,
        failureCount: results.filter(r => r.status === ProcessingStatus.FAILED).length
      }
    })

    this.logger.info('Batch processing completed', {
      batchId,
      totalFiles: files.length,
      successful: results.filter(r => r.status === ProcessingStatus.COMPLETED).length,
      failed: results.filter(r => r.status === ProcessingStatus.FAILED).length
    })

    return results
  }

  /**
   * Extract text from file
   */
  async extractText(file: File | Buffer, options: ProcessingOptions = {}): Promise<string> {
    const result = await this.processFile(file, { ...options, extractText: true })
    return result.extractedText || ''
  }

  /**
   * Extract metadata from file
   */
  async extractMetadata(file: File | Buffer): Promise<any> {
    const validation = await this.validateFile(file)
    if (!validation.isValid) {
      throw new Error(`Cannot extract metadata: ${validation.errors.join(', ')}`)
    }

    const processors = this.processors.get(validation.metadata.format) || []
    if (processors.length === 0) {
      throw new Error(`No processor available for format: ${validation.metadata.format}`)
    }

    return processors[0].extractMetadata(file)
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    const successRate = this.stats.totalJobs > 0 
      ? (this.stats.completedJobs / this.stats.totalJobs) * 100 
      : 0

    const averageProcessingTime = this.stats.completedJobs > 0
      ? this.stats.totalProcessingTime / this.stats.completedJobs
      : 0

    return {
      totalJobs: this.stats.totalJobs,
      completedJobs: this.stats.completedJobs,
      failedJobs: this.stats.failedJobs,
      averageProcessingTime,
      successRate,
      queueSize: this.activeJobs.size,
      activeJobs: this.activeJobs.size,
  byFormat: {} as any // TODO: Implement format-specific stats
    }
  }

  /**
   * Create processing job
   */
  private async createProcessingJob(
    file: File | Buffer, 
    format: FileFormat, 
    options: ProcessingOptions
  ): Promise<ProcessingJob> {
    const jobId = generateCorrelationId()
    const fileName = file instanceof File ? file.name : 'buffer-file'
    const fileSize = file instanceof File ? file.size : file.length

    const job: ProcessingJob = {
      id: jobId,
      fileId: jobId, // In a real implementation, this would be a separate file storage ID
      fileName,
      fileSize,
      format,
      options,
      status: ProcessingStatus.PENDING,
      progress: 0,
      retryCount: 0,
      maxRetries: options.retryAttempts || this.config.retryAttempts,
      priority: options.priority || 'normal',
      createdAt: new Date()
    }

    await this.jobQueue.add(job)
    return job
  }

  /**
   * Execute the actual file processing
   */
  private async executeProcessing(
    file: File | Buffer,
    job: ProcessingJob,
    options: ProcessingOptions
  ): Promise<ProcessingResult> {
    const processors = this.processors.get(job.format) || []
    if (processors.length === 0) {
      throw new Error(`No processor available for format: ${job.format}`)
    }

    // Try processors in order until one succeeds
    let lastError: Error | null = null
    
    for (const processor of processors) {
      try {
        if (!processor.canProcess(file, job.format)) {
          continue
        }

        this.logger.debug('Attempting processing with processor', {
          jobId: job.id,
          processorName: processor.name,
          processorVersion: processor.version
        })

        const result = await processor.process(file, options)
        
        this.logger.debug('Processing successful', {
          jobId: job.id,
          processorName: processor.name
        })

        return result
      } catch (error) {
        lastError = error as Error
        this.logger.warn('Processor failed, trying next', {
          jobId: job.id,
          processorName: processor.name,
          error: lastError.message
        })
        continue
      }
    }

    throw lastError || new Error('All processors failed')
  }

  /**
   * Try fallback strategies
   */
  private async tryFallbackStrategies(
    file: File | Buffer,
    options: ProcessingOptions,
    error: ProcessingError
  ): Promise<ProcessingResult | null> {
    const validation = await this.validateFile(file)
    
    for (const strategy of this.fallbackStrategies) {
      if (strategy.canHandle(error, validation.metadata.format)) {
        try {
          this.logger.info('Attempting fallback strategy', {
            strategyName: strategy.name,
            originalError: error.message
          })

          const result = await strategy.execute(file, options)
          
          this.logger.info('Fallback strategy succeeded', {
            strategyName: strategy.name
          })

          return result
        } catch (fallbackError) {
          this.logger.warn('Fallback strategy failed', {
            strategyName: strategy.name,
            error: (fallbackError as Error).message
          })
        }
      }
    }

    return null
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: ProcessingStatus): Promise<void> {
    await this.jobQueue.update(jobId, { status })
    
    const job = this.activeJobs.get(jobId)
    if (job) {
      job.status = status
    }
  }

  /**
   * Update job with result
   */
  private async updateJobResult(jobId: string, result: ProcessingResult): Promise<void> {
    await this.jobQueue.update(jobId, { 
      status: result.status,
      result,
      completedAt: new Date()
    })
  }

  /**
   * Create processing error
   */
  private createProcessingError(error: any, correlationId?: string): ProcessingError {
    const err = error instanceof Error ? error : new Error(String(error))
    
    return {
      code: 'PROCESSING_ERROR',
      message: err.message,
      details: { correlationId },
      stack: err.stack,
      recoverable: true
    }
  }

  /**
   * Emit processing event
   */
  private async emitEvent(event: ProcessingEvent): Promise<void> {
    // Emit to internal EventEmitter
    this.emit(event.type, event)
    
    // Notify registered listeners
    for (const listener of this.eventListeners) {
      try {
        await listener.onEvent(event)
      } catch (error) {
        this.logger.error('Event listener error', error as Error, {
          eventType: event.type,
          jobId: event.jobId
        })
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up file processing service')
    
    // Cancel all active jobs
    for (const jobId of this.activeJobs.keys()) {
      await this.cancelProcessing(jobId)
    }
    
    // Clear processors and strategies
    this.processors.clear()
    this.fallbackStrategies.length = 0
    this.middleware.length = 0
    this.eventListeners.length = 0
    
    this.removeAllListeners()
  }
}