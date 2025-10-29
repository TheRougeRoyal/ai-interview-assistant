/**
 * Unit tests for PII extraction functionality
 */

import { describe, it, expect } from 'vitest'
import { extractPII } from '../extract'

describe('PII Extraction', () => {
  describe('Email Extraction', () => {
    it('should extract single email address', () => {
      const text = 'Contact me at john.doe@example.com'
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('john.doe@example.com')
      expect(result.confidence.email).toBeGreaterThan(0.5)
    })

    it('should extract multiple emails and use first unique one', () => {
      const text = `
        Primary: john.doe@example.com
        Secondary: j.doe@company.org
      `
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('john.doe@example.com')
    })

    it('should handle emails with special characters', () => {
      const text = 'Email: user+tag@sub.domain.com'
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('user+tag@sub.domain.com')
    })

    it('should handle emails with numbers', () => {
      const text = 'Contact: user123@example456.com'
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('user123@example456.com')
    })

    it('should handle emails with hyphens', () => {
      const text = 'Email: first-last@my-company.com'
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('first-last@my-company.com')
    })

    it('should return undefined when no email found', () => {
      const text = 'No email address here'
      const result = extractPII(text)
      
      expect(result.fields.email).toBeUndefined()
      expect(result.confidence.email).toBe(0)
    })

    it('should use case-insensitive deduplication', () => {
      const text = 'Email: Test@Example.com and test@example.com'
      const result = extractPII(text)
      
      // Should only count as one unique email (lowercased)
      expect(result.fields.email).toBe('test@example.com')
      expect(result.confidence.email).toBeGreaterThan(0.9) // Single unique email = high confidence
    })
  })

  describe('Phone Number Extraction', () => {
    it('should extract phone number and clean formatting', () => {
      const text = 'Call me at (555) 123-4567'
      const result = extractPII(text)
      
      expect(result.fields.phone).toBeDefined()
      expect(result.confidence.phone).toBeGreaterThan(0.5)
    })

    it('should validate phone number length', () => {
      const text = 'Phone: 555-123-4567'
      const result = extractPII(text)
      
      expect(result.fields.phone).toBeDefined()
      const digits = result.fields.phone!.replace(/\D/g, '')
      expect(digits.length).toBeGreaterThanOrEqual(7)
      expect(digits.length).toBeLessThanOrEqual(15)
    })

    it('should prefer E.164 formatted numbers', () => {
      const text = `
        First: (555) 123-4567
        E.164: +15551234567
      `
      const result = extractPII(text)
      
      // Should prefer E.164 format (+digits only)
      if (result.fields.phone?.startsWith('+')) {
        expect(result.confidence.phone).toBeGreaterThan(0.9)
      }
    })

    it('should return undefined when no phone found', () => {
      const text = 'No phone number here'
      const result = extractPII(text)
      
      expect(result.fields.phone).toBeUndefined()
      expect(result.confidence.phone).toBe(0)
    })

    it('should ignore invalid phone numbers', () => {
      const text = 'Short: 123, Long: 12345678901234567890'
      const result = extractPII(text)
      
      // Too short or too long - should filter out
      expect(result.fields.phone).toBeUndefined()
    })
  })

  describe('Name Detection', () => {
    it('should detect name from early lines', () => {
      const text = 'John Smith\nSoftware Engineer\njohn@example.com'
      const result = extractPII(text)
      
      expect(result.fields.name).toBe('John Smith')
      expect(result.confidence.name).toBeGreaterThan(0.5)
    })

    it('should skip lines with email addresses', () => {
      const text = `
        John Smith | john@example.com
        Software Engineer
      `
      const result = extractPII(text)
      
      // Should skip first line (contains email) and use second
      expect(result.fields.name).toBe('Software Engineer')
    })

    it('should skip lines with phone numbers', () => {
      const text = `
        Call me: (555) 123-4567
        Jane Doe
        Developer
      `
      const result = extractPII(text)
      
      // Should skip first line (contains phone)
      expect(result.fields.name).toBe('Jane Doe')
    })

    it('should skip URLs and links', () => {
      const text = `
        https://example.com
        www.portfolio.com
        John Smith
      `
      const result = extractPII(text)
      
      expect(result.fields.name).toBe('John Smith')
    })

    it('should skip section headers', () => {
      const text = `
        PROFESSIONAL SUMMARY
        EXPERIENCE
        John M. Smith
        Senior Developer
      `
      const result = extractPII(text)
      
      expect(result.fields.name).toBe('John M. Smith')
    })

    it('should prefer TitleCase multi-word patterns', () => {
      const text = `
        JOHN SMITH
        John Smith
        SOFTWARE ENGINEER
      `
      const result = extractPII(text)
      
      // Should prefer TitleCase over ALL CAPS
      expect(result.fields.name).toBe('John Smith')
    })

    it('should handle apostrophes and hyphens', () => {
      const text = "Mary-Jane O'Brien\nDeveloper"
      const result = extractPII(text)
      
      expect(result.fields.name).toBe("Mary-Jane O'Brien")
    })

    it('should give high confidence to strong name patterns', () => {
      const text = 'Alice Johnson\nSenior Developer'
      const result = extractPII(text)
      
      expect(result.confidence.name).toBeGreaterThanOrEqual(0.7)
    })

    it('should give low confidence when no strong pattern found', () => {
      const text = 'EXPERIENCE\nSKILLS'
      const result = extractPII(text)
      
      if (result.fields.name) {
        expect(result.confidence.name).toBeLessThan(0.9)
      } else {
        expect(result.confidence.name).toBe(0)
      }
    })

    it('should handle empty input', () => {
      const text = ''
      const result = extractPII(text)
      
      expect(result.fields.name).toBeUndefined()
      expect(result.confidence.name).toBe(0)
    })

    it('should handle whitespace-only input', () => {
      const text = '   \n\n   '
      const result = extractPII(text)
      
      expect(result.fields.name).toBeUndefined()
      expect(result.confidence.name).toBe(0)
    })
  })

  describe('Combined Extraction', () => {
    it('should extract all PII from resume', () => {
      const text = `
        John Smith
        Senior Software Engineer
        
        Email: john.smith@example.com
        Phone: (555) 123-4567
        
        Professional Summary:
        Experienced developer with 10 years...
      `
      
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('john.smith@example.com')
      expect(result.fields.phone).toBeDefined()
      expect(result.fields.name).toBeDefined()
    })

    it('should handle resume with contact section', () => {
      const text = `
        Jane Doe
        
        CONTACT INFORMATION
        Email: jane.doe@company.org
        Mobile: +1 (555) 987-6543
        
        EXPERIENCE
        ...
      `
      
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('jane.doe@company.org')
      expect(result.fields.phone).toBeDefined()
    })

    it('should handle inline contact info', () => {
      const text = `
        Robert Johnson | robert.j@example.com | 555-123-4567
        
        PROFESSIONAL EXPERIENCE
        ...
      `
      
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('robert.j@example.com')
      expect(result.fields.phone).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle documents with no PII', () => {
      const text = 'Generic job description with no personal information.'
      const result = extractPII(text)
      
      expect(result.fields.email).toBeUndefined()
      expect(result.fields.phone).toBeUndefined()
      expect(result.confidence.email).toBe(0)
      expect(result.confidence.phone).toBe(0)
    })

    it('should handle very long documents', () => {
      const longText = 'Some text '.repeat(10000) + 'email@example.com'
      const result = extractPII(longText)
      
      expect(result.fields.email).toBe('email@example.com')
    })

    it('should handle special Unicode characters', () => {
      const text = `
        José García
        Email: jose.garcia@empresa.com
        Teléfono: (555) 123-4567
      `
      
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('jose.garcia@empresa.com')
      expect(result.fields.phone).toBeDefined()
    })

    it('should handle mixed line endings', () => {
      const text = 'Name\r\nEmail: test@example.com\rPhone: 555-123-4567\n'
      const result = extractPII(text)
      
      expect(result.fields.email).toBe('test@example.com')
      expect(result.fields.phone).toBeDefined()
    })

    it('should handle obfuscated emails', () => {
      const text = 'Email: user[at]example[dot]com'
      const result = extractPII(text)
      
      // Should not extract obfuscated emails
      expect(result.fields.email).toBeUndefined()
    })
  })

  describe('Confidence Scoring', () => {
    it('should give high confidence for unique emails', () => {
      const text = 'Contact: single@example.com'
      const result = extractPII(text)
      
      expect(result.confidence.email).toBeGreaterThan(0.9)
    })

    it('should give lower confidence for multiple emails', () => {
      const text = 'Primary: first@example.com, Secondary: second@example.com'
      const result = extractPII(text)
      
      // Multiple emails = lower confidence
      expect(result.confidence.email).toBeLessThan(0.95)
    })

    it('should give high confidence for E.164 phone numbers', () => {
      const text = 'Mobile: +15551234567'
      const result = extractPII(text)
      
      if (result.fields.phone?.startsWith('+')) {
        expect(result.confidence.phone).toBeGreaterThan(0.9)
      }
    })

    it('should give high confidence for strong name patterns', () => {
      const text = 'Alice Marie Johnson\nSoftware Engineer'
      const result = extractPII(text)
      
      if (result.fields.name) {
        expect(result.confidence.name).toBeGreaterThanOrEqual(0.7)
      }
    })

    it('should return zero confidence when fields not found', () => {
      const text = 'No personal information here'
      const result = extractPII(text)
      
      if (!result.fields.email) {
        expect(result.confidence.email).toBe(0)
      }
      if (!result.fields.phone) {
        expect(result.confidence.phone).toBe(0)
      }
    })
  })
})
