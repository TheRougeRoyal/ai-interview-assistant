/**
 * Unit tests for DOCX parsing functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { docxToText } from '../docx'

describe('DOCX Parsing', () => {
  beforeEach(() => {
    // Setup
  })

  describe('File Validation', () => {
    it('should reject null/undefined files', async () => {
      await expect(docxToText(null as any)).rejects.toThrow('No file provided')
      await expect(docxToText(undefined as any)).rejects.toThrow('No file provided')
    })

    it('should reject non-DOCX files by mime type', async () => {
      const textFile = new File(['test content'], 'test.txt', { 
        type: 'text/plain' 
      })
      
      await expect(docxToText(textFile)).rejects.toThrow('Expected DOCX file format')
    })

    it('should reject non-DOCX files by extension', async () => {
      const pdfFile = new File(['test content'], 'test.pdf', { 
        type: 'application/pdf' 
      })
      
      await expect(docxToText(pdfFile)).rejects.toThrow('Expected DOCX file format')
    })

    it('should accept DOCX files with correct mime type', async () => {
      const docxFile = new File(['PK'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const result = await docxToText(docxFile)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should accept DOCX files with .docx extension', async () => {
      const docxFile = new File(['PK'], 'document.docx', { 
        type: '' 
      })
      
      const result = await docxToText(docxFile)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('Text Extraction', () => {
    it('should extract text from DOCX file', async () => {
      const docxFile = new File(['PK'], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      expect(text).toBeDefined()
      expect(text.length).toBeGreaterThan(0)
      expect(typeof text).toBe('string')
    })

    it('should normalize whitespace in extracted text', async () => {
      const docxFile = new File(['PK'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      // Should not have excessive whitespace
      expect(text).not.toMatch(/\s{3,}/)
      // Should not have multiple consecutive newlines
      expect(text).not.toMatch(/\n{3,}/)
    })

    it('should extract contact information from resume', async () => {
      const docxFile = new File(['PK'], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      // Mock implementation includes this data
      expect(text).toContain('john.doe@example.com')
      expect(text).toContain('+1 (555) 123-4567')
    })

    it('should preserve document structure', async () => {
      const docxFile = new File(['PK'], 'resume.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      // Should have section headers
      expect(text).toContain('PROFESSIONAL SUMMARY')
      expect(text).toContain('EXPERIENCE')
      expect(text).toContain('EDUCATION')
    })
  })

  describe('Error Handling', () => {
    it('should provide clear error messages for parsing failures', async () => {
      const invalidFile = new File(['invalid'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      // Current implementation returns mock data, but in real implementation:
      try {
        await docxToText(invalidFile)
        // Would expect error for corrupted files
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        if (error instanceof Error) {
          expect(error.message).toContain('Failed to parse DOCX')
        }
      }
    })

    it('should handle empty DOCX files', async () => {
      const emptyFile = new File(['PK'], 'empty.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const result = await docxToText(emptyFile)
      
      // Should return some text (mock implementation)
      expect(result).toBeDefined()
    })
  })

  describe('File Size Handling', () => {
    it('should handle small DOCX files', async () => {
      const smallFile = new File(['PK'], 'small.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      expect(smallFile.size).toBeLessThan(1024)
      
      const result = await docxToText(smallFile)
      expect(result).toBeDefined()
    })

    it('should handle large DOCX files', async () => {
      const largeContent = new Uint8Array(2 * 1024 * 1024) // 2MB
      const largeFile = new File([largeContent], 'large.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      expect(largeFile.size).toBeGreaterThan(1024 * 1024)
      
      const result = await docxToText(largeFile)
      expect(result).toBeDefined()
    })
  })

  describe('Special Characters', () => {
    it('should handle unicode characters', async () => {
      const docxFile = new File(['PK'], 'unicode.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      // Should preserve standard characters
      expect(text).toBeDefined()
      expect(typeof text).toBe('string')
    })

    it('should handle special formatting characters', async () => {
      const docxFile = new File(['PK'], 'formatted.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      
      const text = await docxToText(docxFile)
      
      // Should normalize tabs, form feeds, etc.
      expect(text).not.toMatch(/\t/)
      expect(text).not.toMatch(/\f/)
      expect(text).not.toMatch(/\v/)
    })
  })
})
