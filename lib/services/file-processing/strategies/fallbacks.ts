/**
 * Fallback strategies for file processing failures
 */

import {
  FallbackStrategy,
  ProcessingError,
  FileFormat,
  ProcessingOptions,
  ProcessingResult,
  ProcessingStatus
} from '../types'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * Simple text extraction fallback for when advanced parsing fails
 * Attempts to extract any readable text from the file
 */
export class SimpleTextExtractionFallback implements FallbackStrategy {
  readonly name = 'SimpleTextExtractionFallback'
  private logger = getApiLogger()

  canHandle(error: ProcessingError, format: FileFormat): boolean {
    // Can handle PDF and DOCX parsing failures
    return (format === FileFormat.PDF || format === FileFormat.DOCX) && 
           error.recoverable
  }

  async execute(file: File | Buffer, originalOptions: ProcessingOptions): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    try {
      this.logger.info('Attempting simple text extraction fallback', {
        jobId,
        fileName: file instanceof File ? file.name : 'buffer-file'
      })

      // Get buffer
      let buffer: Buffer
      if (file instanceof Buffer) {
        buffer = file
      } else if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer())
      } else {
        throw new Error('Invalid file type')
      }

      // Try to extract any UTF-8 text from the buffer
      let extractedText = ''
      const decoded = buffer.toString('utf8')
      
      // Filter out control characters and keep printable text
      const printableChars = decoded.split('').filter(char => {
        const code = char.charCodeAt(0)
        // Keep printable ASCII, whitespace, and common Unicode
        return (code >= 32 && code <= 126) || 
               code === 9 || code === 10 || code === 13 || 
               code >= 128
      }).join('')

      // Extract words (sequences of letters and numbers)
      const words = printableChars.match(/[a-zA-Z0-9]+/g) || []
      extractedText = words.join(' ')

      // If we got very little text, try a different approach
      if (extractedText.length < 100) {
        // Try ASCII extraction with more lenient filtering
        extractedText = buffer.toString('ascii')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      const result: ProcessingResult = {
        id: jobId,
        status: ProcessingStatus.COMPLETED,
        extractedText,
        metadata: {
          wordCount: extractedText.split(/\s+/).filter(w => w.length > 0).length,
          characterCount: extractedText.length,
          pageCount: 1,
          customProperties: {
            extractionMethod: 'fallback-simple-text',
            warning: 'Text extracted using fallback method - may be incomplete'
          }
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }

      this.logger.info('Simple text extraction completed', {
        jobId,
        textLength: extractedText.length,
        processingTime: result.processingTime
      })

      return result

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Simple text extraction fallback failed', err, { jobId })

      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'FALLBACK_EXTRACTION_ERROR',
          message: `Fallback extraction failed: ${err.message}`,
          stack: err.stack,
          recoverable: false
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }
    }
  }
}

/**
 * AI-based text extraction fallback using vision models
 * For PDFs that are image-based or heavily formatted
 */
export class AIVisionExtractionFallback implements FallbackStrategy {
  readonly name = 'AIVisionExtractionFallback'
  private logger = getApiLogger()

  canHandle(error: ProcessingError, format: FileFormat): boolean {
    // Can handle PDF failures that might be image-based
    return format === FileFormat.PDF && 
           error.recoverable &&
           (error.message.includes('image') || 
            error.message.includes('scanned') ||
            error.message.includes('OCR'))
  }

  async execute(file: File | Buffer, originalOptions: ProcessingOptions): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    try {
      this.logger.info('Attempting AI vision extraction fallback', {
        jobId,
        fileName: file instanceof File ? file.name : 'buffer-file'
      })

      // This is a placeholder for AI vision-based extraction
      // In a real implementation, this would:
      // 1. Convert PDF pages to images
      // 2. Send images to vision API (OpenAI GPT-4 Vision, Google Cloud Vision, etc.)
      // 3. Extract text from the vision model response

      // For now, return a failure indicating this needs implementation
      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'AI_VISION_NOT_IMPLEMENTED',
          message: 'AI vision extraction is not yet implemented. This fallback requires OCR or vision API integration.',
          recoverable: false,
          details: {
            suggestion: 'Consider enabling OCR processing in options or implementing AI vision API integration'
          }
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('AI vision extraction fallback failed', err, { jobId })

      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'FALLBACK_AI_VISION_ERROR',
          message: `AI vision fallback failed: ${err.message}`,
          stack: err.stack,
          recoverable: false
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }
    }
  }
}

/**
 * Minimal extraction fallback for when all else fails
 * Returns basic file information even if text extraction completely fails
 */
export class MinimalExtractionFallback implements FallbackStrategy {
  readonly name = 'MinimalExtractionFallback'
  private logger = getApiLogger()

  canHandle(error: ProcessingError, format: FileFormat): boolean {
    // This is the last resort - handles anything
    return true
  }

  async execute(file: File | Buffer, originalOptions: ProcessingOptions): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    this.logger.warn('Using minimal extraction fallback - file processing failed', {
      jobId,
      fileName: file instanceof File ? file.name : 'buffer-file'
    })

    // Return minimal result with file info
    const fileSize = file instanceof File ? file.size : file.length
    const fileName = file instanceof File ? file.name : 'unknown'

    return {
      id: jobId,
      status: ProcessingStatus.COMPLETED,
      extractedText: `[File could not be processed: ${fileName}]`,
      metadata: {
        wordCount: 0,
        characterCount: 0,
        pageCount: 0,
        customProperties: {
          extractionMethod: 'fallback-minimal',
          originalFileName: fileName,
          fileSize,
          warning: 'File could not be processed - no text extracted',
          error: 'All extraction methods failed'
        }
      },
      startedAt,
      completedAt: new Date(),
      processingTime: Date.now() - startedAt.getTime()
    }
  }
}

/**
 * Retry with different options fallback
 * Tries processing again with modified options
 */
export class RetryWithOptionsFallback implements FallbackStrategy {
  readonly name = 'RetryWithOptionsFallback'
  private logger = getApiLogger()
  private processorRegistry: Map<FileFormat, any> = new Map()

  constructor(processors?: Map<FileFormat, any>) {
    if (processors) {
      this.processorRegistry = processors
    }
  }

  canHandle(error: ProcessingError, format: FileFormat): boolean {
    // Can retry for recoverable errors if we have alternative options to try
    return error.recoverable && 
           (format === FileFormat.PDF || format === FileFormat.DOCX)
  }

  async execute(file: File | Buffer, originalOptions: ProcessingOptions): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    try {
      this.logger.info('Attempting retry with modified options fallback', {
        jobId,
        fileName: file instanceof File ? file.name : 'buffer-file',
        originalOptions
      })

      // Try with different options that might succeed
      const alternativeOptions: ProcessingOptions = {
        ...originalOptions,
        enableOCR: false, // Disable OCR if it was enabled (might be causing issues)
        maxPages: originalOptions.maxPages ? originalOptions.maxPages / 2 : 10, // Reduce page limit
        timeout: originalOptions.timeout ? originalOptions.timeout * 2 : 60000, // Increase timeout
      }

      // This would need access to the processor to retry
      // For now, return a result indicating retry should be attempted
      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'RETRY_RECOMMENDED',
          message: 'Retry with modified options is recommended',
          recoverable: true,
          retryAfter: 1000,
          details: {
            alternativeOptions
          }
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Retry with options fallback failed', err, { jobId })

      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'FALLBACK_RETRY_ERROR',
          message: `Retry fallback failed: ${err.message}`,
          stack: err.stack,
          recoverable: false
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }
    }
  }
}
