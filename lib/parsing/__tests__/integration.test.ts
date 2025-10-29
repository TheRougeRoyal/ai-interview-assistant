/**
 * Integration tests for file processing pipeline
 * Tests the complete flow from file upload to PII extraction
 */

import { describe, it, expect } from 'vitest'
import { extractPII } from '../extract'
import { pdfToText } from '../pdf'
import { docxToText } from '../docx'

describe('File Processing Integration', () => {
  describe('PDF to PII Extraction Pipeline', () => {
    it('should extract PII from PDF resume', async () => {
      const pdfFile = new File(['%PDF-1.4 mock content'], 'resume.pdf', {
        type: 'application/pdf',
      })

      const text = await pdfToText(pdfFile)
      expect(text).toBeDefined()
      expect(typeof text).toBe('string')

      const pii = extractPII(text)
      expect(pii.fields).toBeDefined()
      expect(pii.confidence).toBeDefined()
    })

    it('should handle PDF with contact information', async () => {
      const pdfFile = new File(['%PDF-1.4'], 'resume.pdf', {
        type: 'application/pdf',
      })

      const text = await pdfToText(pdfFile)
      const pii = extractPII(text)

      // Check structure
      expect(pii.fields).toHaveProperty('email')
      expect(pii.fields).toHaveProperty('phone')
      expect(pii.fields).toHaveProperty('name')
      expect(pii.confidence).toHaveProperty('email')
      expect(pii.confidence).toHaveProperty('phone')
      expect(pii.confidence).toHaveProperty('name')
    })
  })

  describe('DOCX to PII Extraction Pipeline', () => {
    it('should extract PII from DOCX resume', async () => {
      const docxFile = new File(['PK'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const text = await docxToText(docxFile)
      expect(text).toBeDefined()
      expect(typeof text).toBe('string')

      const pii = extractPII(text)
      expect(pii).toBeDefined()
      expect(pii.fields).toBeDefined()
    })

    it('should extract email from DOCX mock content', async () => {
      const docxFile = new File(['PK'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const text = await docxToText(docxFile)
      const pii = extractPII(text)

      // Mock implementation includes this email
      expect(pii.fields.email).toBe('john.doe@example.com')
      expect(pii.confidence.email).toBeGreaterThan(0)
    })
  })

  describe('Error Handling Across Pipeline', () => {
    it('should handle invalid PDF files', async () => {
      const invalidFile = new File(['invalid content'], 'test.txt', {
        type: 'text/plain',
      })

      await expect(pdfToText(invalidFile)).rejects.toThrow()
    })

    it('should handle invalid DOCX files', async () => {
      const invalidFile = new File(['invalid'], 'test.pdf', {
        type: 'application/pdf',
      })

      await expect(docxToText(invalidFile)).rejects.toThrow()
    })

    it('should handle empty text in PII extraction', () => {
      const pii = extractPII('')
      expect(pii.fields.email).toBeUndefined()
      expect(pii.fields.phone).toBeUndefined()
      expect(pii.fields.name).toBeUndefined()
      expect(pii.confidence.email).toBe(0)
      expect(pii.confidence.phone).toBe(0)
      expect(pii.confidence.name).toBe(0)
    })
  })

  describe('Complete Resume Processing', () => {
    it('should process PDF end-to-end', async () => {
      const resumeFile = new File(['%PDF-1.4'], 'john-smith-resume.pdf', {
        type: 'application/pdf',
      })

      // Step 1: Extract text
      const text = await pdfToText(resumeFile)
      expect(text).toBeDefined()

      // Step 2: Extract PII
      const pii = extractPII(text)
      expect(pii.fields).toBeDefined()

      // Step 3: Validate structure for downstream AI processing
      const processingPayload = {
        text,
        ...pii.fields,
        confidence: pii.confidence,
      }

      expect(processingPayload).toHaveProperty('text')
      expect(processingPayload).toHaveProperty('email')
      expect(processingPayload).toHaveProperty('phone')
      expect(processingPayload).toHaveProperty('name')
      expect(processingPayload).toHaveProperty('confidence')
    })

    it('should process DOCX end-to-end', async () => {
      const resumeFile = new File(['PK'], 'jane-doe-resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const text = await docxToText(resumeFile)
      const pii = extractPII(text)

      const processingPayload = {
        text,
        ...pii.fields,
        confidence: pii.confidence,
      }

      expect(processingPayload.text).toBeDefined()
      expect(processingPayload.confidence).toBeDefined()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large text content', () => {
      const largeText = 'Lorem ipsum '.repeat(10000) + ' john.doe@example.com'
      const pii = extractPII(largeText)

      expect(pii.fields.email).toBe('john.doe@example.com')
    })

    it('should handle minimal resume content', () => {
      const minimalText = 'John Smith\njohn@example.com\n555-123-4567'
      const pii = extractPII(minimalText)

      expect(pii.fields.name).toBe('John Smith')
      expect(pii.fields.email).toBe('john@example.com')
      expect(pii.fields.phone).toBeDefined()
    })

    it('should handle special characters in names', () => {
      const text = "José García-López\njose.garcia@example.com"
      const pii = extractPII(text)

      expect(pii.fields.name).toBe('José García-López')
      expect(pii.fields.email).toBe('jose.garcia@example.com')
    })

    it('should handle multiple email addresses', () => {
      const text = `
        john.doe@work.com
        john.doe@personal.com
        Contact me at either email
      `
      const pii = extractPII(text)

      // Should extract first one (lowercased and deduplicated)
      expect(pii.fields.email).toBeDefined()
      expect(pii.confidence.email).toBeGreaterThan(0)
    })
  })

  describe('Data Flow Validation', () => {
    it('should maintain data integrity through pipeline', async () => {
      const testEmail = 'test@example.com'
      const testPhone = '555-123-4567'
      
      // Mock content that would be in a resume
      const mockResumeText = `
        Jane Doe
        ${testEmail}
        ${testPhone}
        
        Professional Summary: Experienced developer...
      `

      const pii = extractPII(mockResumeText)

      expect(pii.fields.email).toBe(testEmail)
      expect(pii.fields.phone).toBeDefined()
      expect(pii.fields.name).toBe('Jane Doe')
    })

    it('should provide confidence scores for all fields', () => {
      const text = 'John Smith\njohn@example.com\n555-123-4567'
      const pii = extractPII(text)

      expect(typeof pii.confidence.email).toBe('number')
      expect(typeof pii.confidence.phone).toBe('number')
      expect(typeof pii.confidence.name).toBe('number')

      expect(pii.confidence.email).toBeGreaterThanOrEqual(0)
      expect(pii.confidence.email).toBeLessThanOrEqual(1)
    })
  })

  describe('File Type Interoperability', () => {
    it('should handle same content from different file types', async () => {
      const pdfFile = new File(['%PDF-1.4'], 'resume.pdf', {
        type: 'application/pdf',
      })

      const docxFile = new File(['PK'], 'resume.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const pdfText = await pdfToText(pdfFile)
      const docxText = await docxToText(docxFile)

      const pdfPII = extractPII(pdfText)
      const docxPII = extractPII(docxText)

      // Both should have consistent structure
      expect(pdfPII.fields).toBeDefined()
      expect(docxPII.fields).toBeDefined()
      expect(pdfPII.confidence).toBeDefined()
      expect(docxPII.confidence).toBeDefined()
    })
  })
})
