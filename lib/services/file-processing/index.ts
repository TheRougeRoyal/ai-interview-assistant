/**
 * File Processing Service Factory and Initialization
 * Creates and configures the file processing service with all processors and strategies
 */

import { FileProcessingService } from './core/FileProcessingService'
import { ProcessingJobQueue } from './core/ProcessingJobQueue'
import { PDFFileProcessor } from './processors/PDFFileProcessor'
import { DOCXFileProcessor } from './processors/DOCXFileProcessor'
import {
  SimpleTextExtractionFallback,
  AIVisionExtractionFallback,
  MinimalExtractionFallback,
  RetryWithOptionsFallback
} from './strategies/fallbacks'
import { FileProcessingConfig, FileFormat } from './types'
import { getApiLogger } from '@/lib/logging'

/**
 * Default file processing configuration
 */
const DEFAULT_CONFIG: FileProcessingConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxConcurrentJobs: 5,
  defaultTimeout: 30000, // 30 seconds
  retryAttempts: 3,
  supportedFormats: [FileFormat.PDF, FileFormat.DOCX],
  enableOCR: false, // OCR disabled by default (requires additional setup)
  ocrLanguages: ['eng'], // Default to English
  tempDirectory: '/tmp',
  storageProvider: 'local',
  queueProvider: 'memory'
}

/**
 * Create and configure a file processing service instance
 */
export function createFileProcessingService(
  config: Partial<FileProcessingConfig> = {}
): FileProcessingService {
  const logger = getApiLogger()
  
  logger.info('Initializing file processing service', {
    config: { ...DEFAULT_CONFIG, ...config }
  })

  // Merge with defaults
  const finalConfig: FileProcessingConfig = {
    ...DEFAULT_CONFIG,
    ...config
  }

  // Create job queue
  const jobQueue = new ProcessingJobQueue()

  // Create service instance
  const service = new FileProcessingService(finalConfig, jobQueue)

  // Register file processors
  logger.debug('Registering file processors')
  
  if (finalConfig.supportedFormats.includes(FileFormat.PDF)) {
    service.registerProcessor(new PDFFileProcessor())
    logger.debug('Registered PDF processor')
  }

  if (finalConfig.supportedFormats.includes(FileFormat.DOCX)) {
    service.registerProcessor(new DOCXFileProcessor())
    logger.debug('Registered DOCX processor')
  }

  // Register fallback strategies (in order of preference)
  logger.debug('Registering fallback strategies')
  
  // 1. Simple text extraction (for basic parsing failures)
  service.registerFallbackStrategy(new SimpleTextExtractionFallback())
  
  // 2. AI vision extraction (for image-based PDFs)
  if (finalConfig.enableOCR) {
    service.registerFallbackStrategy(new AIVisionExtractionFallback())
  }
  
  // 3. Retry with different options
  service.registerFallbackStrategy(new RetryWithOptionsFallback())
  
  // 4. Minimal extraction (last resort)
  service.registerFallbackStrategy(new MinimalExtractionFallback())

  logger.info('File processing service initialized successfully', {
    processors: service.getSupportedFormats(),
    fallbackStrategies: 4
  })

  return service
}

/**
 * Create a file processing service for development/testing
 * with relaxed constraints and additional logging
 */
export function createDevFileProcessingService(): FileProcessingService {
  return createFileProcessingService({
    maxFileSize: 50 * 1024 * 1024, // 50MB for dev
    maxConcurrentJobs: 10,
    defaultTimeout: 60000, // 60 seconds
    retryAttempts: 5,
    enableOCR: false // Keep disabled unless OCR tools are installed
  })
}

/**
 * Create a file processing service for production
 * with strict limits and optimized settings
 */
export function createProductionFileProcessingService(): FileProcessingService {
  return createFileProcessingService({
    maxFileSize: 5 * 1024 * 1024, // 5MB limit in production
    maxConcurrentJobs: 3,
    defaultTimeout: 20000, // 20 seconds
    retryAttempts: 2,
    enableOCR: false // Enable only if OCR infrastructure is available
  })
}

/**
 * Singleton instance for the application
 * Use this for consistent service access across the app
 */
let serviceInstance: FileProcessingService | null = null

/**
 * Get or create the singleton file processing service instance
 */
export function getFileProcessingService(
  config?: Partial<FileProcessingConfig>
): FileProcessingService {
  if (!serviceInstance) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (config) {
      serviceInstance = createFileProcessingService(config)
    } else if (isDevelopment) {
      serviceInstance = createDevFileProcessingService()
    } else {
      serviceInstance = createProductionFileProcessingService()
    }
  }

  return serviceInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetFileProcessingService(): void {
  if (serviceInstance) {
    serviceInstance.cleanup()
    serviceInstance = null
  }
}

/**
 * Convenience export for direct usage
 */
export { FileProcessingService, ProcessingJobQueue }
export * from './types'
