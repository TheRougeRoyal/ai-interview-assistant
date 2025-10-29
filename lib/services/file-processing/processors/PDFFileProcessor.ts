/**
 * PDF File Processor implementation
 * Integrates with native PDF parsing (pdftotext + pdf-parse fallback)
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
import { pdfToTextWithMetadata, PDFParseResult } from '@/lib/parsing/pdf'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * PDF file processor using native pdftotext and pdf-parse
 */
export class PDFFileProcessor implements FileProcessor {
  readonly supportedFormats = [FileFormat.PDF]
  readonly name = 'PDFFileProcessor'
  readonly version = '1.0.0'
  
  private logger = getApiLogger()

  /**
   * Check if this processor can handle the file
   */
  canProcess(file: File | Buffer, format: FileFormat): boolean {
    if (format !== FileFormat.PDF) {
      return false
    }

    // Check file signature
    const buffer = file instanceof Buffer ? file : null
    if (buffer) {
      const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      return buffer.subarray(0, 4).equals(pdfSignature)
    }

    // For File objects, check mime type and extension
    if (file instanceof File) {
      const isPdfMime = file.type === 'application/pdf'
      const isPdfExt = file.name?.toLowerCase().endsWith('.pdf')
      return isPdfMime || isPdfExt
    }

    return false
  }

  /**
   * Process PDF file
   */
  async process(file: File | Buffer, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const jobId = generateCorrelationId()
    const startedAt = new Date()

    try {
      this.logger.info('Starting PDF processing', {
        jobId,
        fileName: file instanceof File ? file.name : 'buffer-file',
        options
      })

      // Convert Buffer to File if needed (for compatibility with pdf.ts)
      const fileToProcess = await this.ensureFile(file)

      // Extract text and metadata using native parser
      const parseResult = await pdfToTextWithMetadata(fileToProcess)

      // Transform to standard processing result
      const result: ProcessingResult = {
        id: jobId,
        status: ProcessingStatus.COMPLETED,
        extractedText: parseResult.text,
        metadata: this.transformMetadata(parseResult),
        startedAt,
        completedAt: new Date(),
        processingTime: Date.now() - startedAt.getTime()
      }

      this.logger.info('PDF processing completed', {
        jobId,
        textLength: parseResult.text.length,
        pageCount: parseResult.metadata.pageCount,
        processingTime: result.processingTime
      })

      return result

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('PDF processing failed', err, { jobId })

      return {
        id: jobId,
        status: ProcessingStatus.FAILED,
        error: {
          code: 'PDF_PROCESSING_ERROR',
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
   * Validate PDF file
   */
  async validate(file: File | Buffer): Promise<FileValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const buffer = await this.getBuffer(file)

      // Check file size
      if (buffer.length === 0) {
        errors.push('PDF file is empty')
      }

      // Check PDF signature
      const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      if (buffer.length < 4 || !buffer.subarray(0, 4).equals(pdfSignature)) {
        errors.push('Invalid PDF header - file may be corrupted')
      }

      // Check for PDF trailer
      const content = buffer.toString('binary')
      if (!content.includes('%%EOF')) {
        warnings.push('PDF trailer not found - file may be incomplete')
      }

      // Check for encrypted PDF
      if (content.includes('/Encrypt')) {
        errors.push('PDF is encrypted - cannot process encrypted files')
      }

      // Check for scanned PDF (no text layer)
      const hasTextContent = content.includes('/Type/Page') && 
                            (content.includes('/Contents') || content.includes('/Text'))
      if (!hasTextContent) {
        warnings.push('PDF may be image-only (scanned) - OCR may be required')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          size: buffer.length,
          format: FileFormat.PDF,
          mimeType: 'application/pdf'
        }
      }

    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: [],
        metadata: {
          size: 0,
          format: FileFormat.PDF,
          mimeType: 'application/pdf'
        }
      }
    }
  }

  /**
   * Extract metadata from PDF
   */
  async extractMetadata(file: File | Buffer): Promise<FileMetadata> {
    try {
      const fileToProcess = await this.ensureFile(file)
      const parseResult = await pdfToTextWithMetadata(fileToProcess)
      return this.transformMetadata(parseResult)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.logger.error('Failed to extract PDF metadata', err)
      throw error
    }
  }

  /**
   * Transform PDF parse result metadata to standard format
   */
  private transformMetadata(parseResult: PDFParseResult): FileMetadata {
    const metadata: FileMetadata = {
      pageCount: parseResult.metadata.pageCount,
      wordCount: parseResult.text.split(/\s+/).filter(w => w.length > 0).length,
      characterCount: parseResult.text.length
    }

    // Add optional metadata if available
    if (parseResult.metadata.title) {
      metadata.title = parseResult.metadata.title
    }
    if (parseResult.metadata.author) {
      metadata.author = parseResult.metadata.author
    }
    if (parseResult.metadata.subject) {
      metadata.subject = parseResult.metadata.subject
    }
    if (parseResult.metadata.creator) {
      metadata.creator = parseResult.metadata.creator
    }
    if (parseResult.metadata.producer) {
      metadata.producer = parseResult.metadata.producer
    }
    if (parseResult.metadata.creationDate) {
      metadata.creationDate = this.parseDate(parseResult.metadata.creationDate)
    }
    if (parseResult.metadata.modificationDate) {
      metadata.modificationDate = this.parseDate(parseResult.metadata.modificationDate)
    }
    if (parseResult.metadata.keywords) {
      metadata.keywords = parseResult.metadata.keywords.split(/[,;]/).map(k => k.trim())
    }

    // Store raw PDF metadata as custom properties
    metadata.customProperties = {
      pdfVersion: parseResult.metadata.pdfVersion,
      pageTexts: parseResult.pageTexts
    }

    return metadata
  }

  /**
   * Parse PDF date string to Date object
   */
  private parseDate(dateString: string): Date | undefined {
    try {
      // PDF date format: D:YYYYMMDDHHmmSSOHH'mm
      if (dateString.startsWith('D:')) {
        const year = parseInt(dateString.substring(2, 6))
        const month = parseInt(dateString.substring(6, 8)) - 1
        const day = parseInt(dateString.substring(8, 10))
        const hour = parseInt(dateString.substring(10, 12) || '0')
        const minute = parseInt(dateString.substring(12, 14) || '0')
        const second = parseInt(dateString.substring(14, 16) || '0')
        
        return new Date(year, month, day, hour, minute, second)
      }
      
      // Try standard date parsing
      return new Date(dateString)
    } catch {
      return undefined
    }
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
    const blob = new Blob([uint8Array], { type: 'application/pdf' })
    return new File([blob], 'document.pdf', { type: 'application/pdf' })
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
