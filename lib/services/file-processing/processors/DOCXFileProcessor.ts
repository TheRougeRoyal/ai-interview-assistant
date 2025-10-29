/**
 * DOCX File Processor implementation
 * Integrates with existing DOCX parsing
 */

import {
  FileProcessor,
  ProcessingOptions,
  ProcessingResult,
  FileValidationResult,
  FileMetadata,
  FileFormat,
  ProcessingStatus
} from '../types'
import { docxToText } from '@/lib/parsing/docx'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * DOCX file processor
 */
export class DOCXFileProcessor implements FileProcessor {
  readonly supportedFormats = [FileFormat.DOCX]
  readonly name = 'DOCXFileProcessor'
  readonly version = '1.0.0'
  
  private logger = getApiLogger()

  /**
   * Check if this processor can handle the file
   */
  canProcess(file: File | Buffer, format: FileFormat): boolean {
    if (format !== FileFormat.DOCX) {
      return false
    }

    // Check file signature for ZIP (DOCX is a ZIP file)
    const buffer = file instanceof Buffer ? file : null
    if (buffer) {
      const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04]) // PK..
      return buffer.length >= 4 && buffer.subarray(0, 4).equals(zipSignature)
    }

    // For File objects, check mime type and extension
    if (file instanceof File) {
      const isDocxMime = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      const isDocxExt = file.name?.toLowerCase().endsWith('.docx')
      return isDocxMime || isDocxExt
    }

    return false
  }

  /**
   * Process DOCX file
   */
  async process(file: File | Buffer, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    try {
      this.logger.info('Starting DOCX processing', {
        jobId,
        fileName: file instanceof File ? file.name : 'buffer-file',
        options
      })

      // Convert Buffer to File if needed
      const fileToProcess = await this.ensureFile(file)

      // Extract text using DOCX parser
      const extractedText = await docxToText(fileToProcess)

      // Extract basic metadata
      const metadata = this.extractBasicMetadata(extractedText, file)

      const result: ProcessingResult = {
        id: jobId,
        status: ProcessingStatus.COMPLETED,
        extractedText,
        metadata,
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }

      this.logger.info('DOCX processing completed', {
        jobId,
        textLength: extractedText.length,
        wordCount: metadata.wordCount,
        processingTime: result.processingTime
      })

      return result

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('DOCX processing failed', err, { jobId })

      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'DOCX_PROCESSING_ERROR',
          message: err.message,
          stack: err.stack,
          recoverable: true
        },
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }
    }
  }

  /**
   * Validate DOCX file
   */
  async validate(file: File | Buffer): Promise<FileValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const buffer = await this.getBuffer(file)

      // Check file size
      if (buffer.length === 0) {
        errors.push('DOCX file is empty')
      }

      // Check ZIP signature (DOCX is a ZIP file)
      const zipSignature = Buffer.from([0x50, 0x4B, 0x03, 0x04])
      if (buffer.length < 4 || !buffer.subarray(0, 4).equals(zipSignature)) {
        errors.push('Invalid DOCX/ZIP header - file may be corrupted')
      }

      // Check for DOCX-specific content markers
      const content = buffer.toString('binary')
      if (!content.includes('word/document.xml')) {
        warnings.push('DOCX structure may be invalid - missing document.xml')
      }

      // Check for password protection
      if (content.includes('EncryptedPackage') || content.includes('EncryptionInfo')) {
        errors.push('DOCX is password-protected - cannot process encrypted files')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          size: buffer.length,
          format: FileFormat.DOCX,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: [],
        metadata: {
          size: 0,
          format: FileFormat.DOCX,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      }
    }
  }

  /**
   * Extract metadata from DOCX
   */
  async extractMetadata(file: File | Buffer): Promise<FileMetadata> {
    try {
      const fileToProcess = await this.ensureFile(file)
      const text = await docxToText(fileToProcess)
      return this.extractBasicMetadata(text, file)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Failed to extract DOCX metadata', err)
      throw error
    }
  }

  /**
   * Extract basic metadata from DOCX content
   */
  private extractBasicMetadata(text: string, file: File | Buffer): FileMetadata {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
    const characterCount = text.length
    
    // Estimate page count (roughly 500 words per page)
    const pageCount = Math.max(1, Math.ceil(wordCount / 500))

    const metadata: FileMetadata = {
      wordCount,
      characterCount,
      pageCount
    }

    // Add file-specific metadata if available
    if (file instanceof File) {
      // Could extract title from filename
      const fileName = file.name.replace(/\.docx$/i, '')
      metadata.title = fileName
    }

    return metadata
  }

  /**
   * Convert Buffer to File object
   */
  private async ensureFile(file: File | Buffer): Promise<File> {
    if (file instanceof File) {
      return file
    }

    // Create a File object from Buffer
    const uint8Array = new Uint8Array(file)
    const blob = new Blob([uint8Array], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
    return new File([blob], 'document.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
  }

  /**
   * Get buffer from File or Buffer
   */
  private async getBuffer(file: File | Buffer): Promise<Buffer> {
    if (file instanceof Buffer) {
      return file
    }

    // For File objects
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      return Buffer.from(arrayBuffer)
    }

    throw new Error('Invalid file type')
  }
}
