/**
 * File validation utilities
 */

import { 
  FileValidationResult, 
  FileFormat, 
  FileProcessingConfig 
} from '../types'
import { getApiLogger } from '@/lib/logging'

/**
 * File validator class
 */
export class FileValidator {
  private logger = getApiLogger()
  
  // MIME type mappings
  private readonly mimeTypeMap = new Map<string, FileFormat>([
    ['application/pdf', FileFormat.PDF],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', FileFormat.DOCX],
    ['application/msword', FileFormat.DOC],
    ['text/plain', FileFormat.TXT],
    ['application/rtf', FileFormat.RTF],
    ['text/rtf', FileFormat.RTF]
  ])

  // File signatures (magic numbers)
  private readonly fileSignatures = new Map<FileFormat, Buffer[]>([
    [FileFormat.PDF, [Buffer.from([0x25, 0x50, 0x44, 0x46])]],
    [FileFormat.DOCX, [Buffer.from([0x50, 0x4B, 0x03, 0x04])]],
    [FileFormat.DOC, [Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])]],
    [FileFormat.RTF, [Buffer.from([0x7B, 0x5C, 0x72, 0x74, 0x66])]]
  ])

  constructor(private config: FileProcessingConfig) {}

  /**
   * Validate a file
   */
  async validate(file: File | Buffer): Promise<FileValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Get file buffer
      const buffer = await this.getFileBuffer(file)
      
      // Basic size validation
      if (buffer.length === 0) {
        errors.push('File is empty')
      }
      
      if (buffer.length > this.config.maxFileSize) {
        errors.push(`File size (${buffer.length} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`)
      }

      // Detect file format
      const format = await this.detectFileFormat(file, buffer)
      if (!format) {
        errors.push('Unable to determine file format')
      }

      // Check if format is supported
      if (format && !this.config.supportedFormats.includes(format)) {
        errors.push(`File format '${format}' is not supported`)
      }

      // Validate file signature
      if (format) {
        const signatureValid = this.validateFileSignature(buffer, format)
        if (!signatureValid) {
          warnings.push('File signature does not match expected format')
        }
      }

      // Additional format-specific validation
      if (format) {
        const formatValidation = await this.validateFormat(buffer, format)
        errors.push(...formatValidation.errors)
        warnings.push(...formatValidation.warnings)
      }

      // Get MIME type
      const mimeType = file instanceof File ? file.type : this.getMimeTypeFromFormat(format)

      const result: FileValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          size: buffer.length,
          format: format || FileFormat.TXT,
          mimeType: mimeType || 'application/octet-stream',
          encoding: await this.detectEncoding(buffer)
        }
      }

      this.logger.debug('File validation completed', {
        isValid: result.isValid,
        format,
        size: buffer.length,
        errorCount: errors.length,
        warningCount: warnings.length
      })

      return result

    } catch (error) {
      this.logger.error('File validation failed', error as Error)
      
      return {
        isValid: false,
        errors: [`Validation error: ${(error as Error).message}`],
        warnings: [],
        metadata: {
          size: 0,
          format: FileFormat.TXT,
          mimeType: 'application/octet-stream'
        }
      }
    }
  }

  /**
   * Detect file format from file and content
   */
  private async detectFileFormat(file: File | Buffer, buffer: Buffer): Promise<FileFormat | null> {
    // Try to detect from MIME type first (for File objects)
    if (file instanceof File && file.type) {
      const formatFromMime = this.mimeTypeMap.get(file.type)
      if (formatFromMime) {
        return formatFromMime
      }
    }

    // Try to detect from file extension (for File objects)
    if (file instanceof File && file.name) {
      const formatFromExtension = this.getFormatFromExtension(file.name)
      if (formatFromExtension) {
        return formatFromExtension
      }
    }

    // Try to detect from file signature
    const formatFromSignature = this.detectFormatFromSignature(buffer)
    if (formatFromSignature) {
      return formatFromSignature
    }

    // Try to detect from content analysis
    return this.detectFormatFromContent(buffer)
  }

  /**
   * Get format from file extension
   */
  private getFormatFromExtension(fileName: string): FileFormat | null {
    const extension = fileName.toLowerCase().split('.').pop()
    
    switch (extension) {
      case 'pdf':
        return FileFormat.PDF
      case 'docx':
        return FileFormat.DOCX
      case 'doc':
        return FileFormat.DOC
      case 'txt':
        return FileFormat.TXT
      case 'rtf':
        return FileFormat.RTF
      default:
        return null
    }
  }

  /**
   * Detect format from file signature
   */
  private detectFormatFromSignature(buffer: Buffer): FileFormat | null {
    for (const [format, signatures] of this.fileSignatures.entries()) {
      for (const signature of signatures) {
        if (buffer.subarray(0, signature.length).equals(signature)) {
          return format
        }
      }
    }
    return null
  }

  /**
   * Detect format from content analysis
   */
  private detectFormatFromContent(buffer: Buffer): FileFormat | null {
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length))
    
    // Check for RTF content
    if (content.startsWith('{\\rtf')) {
      return FileFormat.RTF
    }
    
    // Check for plain text (basic heuristic)
    if (this.isPlainText(buffer)) {
      return FileFormat.TXT
    }
    
    return null
  }

  /**
   * Validate file signature matches expected format
   */
  private validateFileSignature(buffer: Buffer, format: FileFormat): boolean {
    const signatures = this.fileSignatures.get(format)
    if (!signatures) {
      return true // No signature validation for this format
    }
    
    return signatures.some(signature => 
      buffer.subarray(0, signature.length).equals(signature)
    )
  }

  /**
   * Format-specific validation
   */
  private async validateFormat(buffer: Buffer, format: FileFormat): Promise<{
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    
    switch (format) {
      case FileFormat.PDF:
        return this.validatePDF(buffer)
      case FileFormat.DOCX:
        return this.validateDOCX(buffer)
      case FileFormat.DOC:
        return this.validateDOC(buffer)
      case FileFormat.RTF:
        return this.validateRTF(buffer)
      case FileFormat.TXT:
        return this.validateTXT(buffer)
      default:
        return { errors, warnings }
    }
  }

  /**
   * Validate PDF file
   */
  private validatePDF(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check PDF header
    if (!buffer.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
      errors.push('Invalid PDF header')
    }
    
    // Check for PDF trailer
    const content = buffer.toString('binary')
    if (!content.includes('%%EOF')) {
      warnings.push('PDF trailer not found - file may be corrupted')
    }
    
    // Check for encrypted PDF
    if (content.includes('/Encrypt')) {
      warnings.push('PDF appears to be encrypted')
    }
    
    return { errors, warnings }
  }

  /**
   * Validate DOCX file
   */
  private validateDOCX(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // DOCX is a ZIP file, check ZIP signature
    if (!buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]))) {
      errors.push('Invalid DOCX/ZIP header')
    }
    
    // Check for DOCX-specific content
    const content = buffer.toString('binary')
    if (!content.includes('word/document.xml')) {
      warnings.push('DOCX structure may be invalid - missing document.xml')
    }
    
    return { errors, warnings }
  }

  /**
   * Validate DOC file
   */
  private validateDOC(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check OLE header
    const oleSignature = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])
    if (!buffer.subarray(0, 8).equals(oleSignature)) {
      errors.push('Invalid DOC/OLE header')
    }
    
    return { errors, warnings }
  }

  /**
   * Validate RTF file
   */
  private validateRTF(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    const content = buffer.toString('utf8', 0, Math.min(1000, buffer.length))
    
    if (!content.startsWith('{\\rtf')) {
      errors.push('Invalid RTF header')
    }
    
    // Check for balanced braces (basic check)
    const openBraces = (content.match(/\{/g) || []).length
    const closeBraces = (content.match(/\}/g) || []).length
    
    if (openBraces !== closeBraces) {
      warnings.push('RTF may have unbalanced braces')
    }
    
    return { errors, warnings }
  }

  /**
   * Validate TXT file
   */
  private validateTXT(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check if content is valid text
    if (!this.isPlainText(buffer)) {
      warnings.push('File contains binary data but is treated as text')
    }
    
    return { errors, warnings }
  }

  /**
   * Check if buffer contains plain text
   */
  private isPlainText(buffer: Buffer): boolean {
    // Simple heuristic: check for null bytes and control characters
    for (let i = 0; i < Math.min(1000, buffer.length); i++) {
      const byte = buffer[i]
      // Allow printable ASCII, whitespace, and common Unicode
      if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
        return false
      }
    }
    return true
  }

  /**
   * Detect text encoding
   */
  private async detectEncoding(buffer: Buffer): Promise<string | undefined> {
    // Check for BOM
    if (buffer.length >= 3) {
      // UTF-8 BOM
      if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf-8'
      }
      
      // UTF-16 BE BOM
      if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf-16be'
      }
      
      // UTF-16 LE BOM
      if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf-16le'
      }
    }
    
    // Default to UTF-8 for text files
    return 'utf-8'
  }

  /**
   * Get MIME type from format
   */
  private getMimeTypeFromFormat(format: FileFormat | null): string | undefined {
    if (!format) return undefined
    
    for (const [mimeType, fmt] of this.mimeTypeMap.entries()) {
      if (fmt === format) {
        return mimeType
      }
    }
    
    return undefined
  }

  /**
   * Get file buffer from File or Buffer
   */
  private async getFileBuffer(file: File | Buffer): Promise<Buffer> {
    // Node Buffer path
    if ((file as any)?.byteLength !== undefined && typeof (file as any).subarray === 'function') {
      return file as Buffer
    }

    // Browser File/Blob path
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        resolve(Buffer.from(arrayBuffer))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsArrayBuffer(file as File)
    })
  }
}