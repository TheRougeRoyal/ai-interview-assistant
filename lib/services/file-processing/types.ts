/**
 * File processing service types and interfaces
 */

/**
 * Supported file formats
 */
export enum FileFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  DOC = 'doc',
  TXT = 'txt',
  RTF = 'rtf'
}

/**
 * File processing status
 */
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * File validation result
 */
export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: {
    size: number
    format: FileFormat
    mimeType: string
    encoding?: string
  }
}

/**
 * File processing options
 */
export interface ProcessingOptions {
  extractText?: boolean
  extractMetadata?: boolean
  validateContent?: boolean
  enableOCR?: boolean
  ocrLanguage?: string
  maxPages?: number
  timeout?: number
  retryAttempts?: number
  priority?: 'low' | 'normal' | 'high'
}

/**
 * File processing result
 */
export interface ProcessingResult {
  id: string
  status: ProcessingStatus
  extractedText?: string
  metadata?: FileMetadata
  error?: ProcessingError
  progress?: number
  startedAt: Date
  completedAt?: Date
  processingTime?: number
}

/**
 * File metadata
 */
export interface FileMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  pageCount?: number
  wordCount?: number
  characterCount?: number
  language?: string
  keywords?: string[]
  customProperties?: Record<string, any>
}

/**
 * Processing error details
 */
export interface ProcessingError {
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
  recoverable: boolean
  retryAfter?: number
}

/**
 * File processor interface
 */
export interface FileProcessor {
  readonly supportedFormats: FileFormat[]
  readonly name: string
  readonly version: string
  
  canProcess(file: File | Buffer, format: FileFormat): boolean
  process(file: File | Buffer, options?: ProcessingOptions): Promise<ProcessingResult>
  validate(file: File | Buffer): Promise<FileValidationResult>
  extractMetadata(file: File | Buffer): Promise<FileMetadata>
}

/**
 * File processing service interface
 */
export interface FileProcessingService {
  // Core processing methods
  processFile(file: File | Buffer, options?: ProcessingOptions): Promise<ProcessingResult>
  getProcessingStatus(jobId: string): Promise<ProcessingResult>
  cancelProcessing(jobId: string): Promise<boolean>
  
  // Validation methods
  validateFile(file: File | Buffer): Promise<FileValidationResult>
  getSupportedFormats(): FileFormat[]
  
  // Batch processing
  processBatch(files: Array<File | Buffer>, options?: ProcessingOptions): Promise<ProcessingResult[]>
  
  // Utility methods
  extractText(file: File | Buffer, options?: ProcessingOptions): Promise<string>
  extractMetadata(file: File | Buffer): Promise<FileMetadata>
  
  // Event handling
  onProgress?(jobId: string, progress: number): void
  onComplete?(jobId: string, result: ProcessingResult): void
  onError?(jobId: string, error: ProcessingError): void
}

/**
 * Processing job queue interface
 */
export interface ProcessingJobQueue {
  add(job: ProcessingJob): Promise<string>
  get(jobId: string): Promise<ProcessingJob | null>
  update(jobId: string, updates: Partial<ProcessingJob>): Promise<void>
  remove(jobId: string): Promise<boolean>
  list(status?: ProcessingStatus): Promise<ProcessingJob[]>
  clear(): Promise<void>
}

/**
 * Processing job definition
 */
export interface ProcessingJob {
  id: string
  fileId: string
  fileName: string
  fileSize: number
  format: FileFormat
  options: ProcessingOptions
  status: ProcessingStatus
  progress: number
  result?: ProcessingResult
  error?: ProcessingError
  retryCount: number
  maxRetries: number
  priority: 'low' | 'normal' | 'high'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number
  actualDuration?: number
}

/**
 * File storage interface
 */
export interface FileStorage {
  store(file: File | Buffer, metadata: FileMetadata): Promise<string>
  retrieve(fileId: string): Promise<Buffer>
  delete(fileId: string): Promise<boolean>
  exists(fileId: string): Promise<boolean>
  getMetadata(fileId: string): Promise<FileMetadata>
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  totalJobs: number
  completedJobs: number
  failedJobs: number
  averageProcessingTime: number
  successRate: number
  queueSize: number
  activeJobs: number
  byFormat: Record<FileFormat, {
    count: number
    averageTime: number
    successRate: number
  }>
}

/**
 * Service configuration
 */
export interface FileProcessingConfig {
  maxFileSize: number
  maxConcurrentJobs: number
  defaultTimeout: number
  retryAttempts: number
  supportedFormats: FileFormat[]
  enableOCR: boolean
  ocrLanguages: string[]
  tempDirectory: string
  storageProvider: 'local' | 's3' | 'gcs'
  queueProvider: 'memory' | 'redis' | 'database'
}

/**
 * Event types for file processing
 */
export enum ProcessingEventType {
  JOB_CREATED = 'job_created',
  JOB_STARTED = 'job_started',
  JOB_PROGRESS = 'job_progress',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_CANCELLED = 'job_cancelled',
  BATCH_STARTED = 'batch_started',
  BATCH_COMPLETED = 'batch_completed'
}

/**
 * Processing event
 */
export interface ProcessingEvent {
  type: ProcessingEventType
  jobId: string
  timestamp: Date
  data?: Record<string, any>
}

/**
 * Event listener interface
 */
export interface ProcessingEventListener {
  onEvent(event: ProcessingEvent): void | Promise<void>
}

/**
 * Fallback strategy for failed processing
 */
export interface FallbackStrategy {
  name: string
  canHandle(error: ProcessingError, format: FileFormat): boolean
  execute(file: File | Buffer, originalOptions: ProcessingOptions): Promise<ProcessingResult>
}

/**
 * Processing middleware interface
 */
export interface ProcessingMiddleware {
  name: string
  beforeProcess?(job: ProcessingJob): Promise<ProcessingJob>
  afterProcess?(job: ProcessingJob, result: ProcessingResult): Promise<ProcessingResult>
  onError?(job: ProcessingJob, error: ProcessingError): Promise<ProcessingError>
}