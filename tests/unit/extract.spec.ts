import { describe, it, expect } from 'vitest'
import { extractPII } from '@/lib/parsing/extract'

describe('extractPII', () => {
  it('extracts email only', () => {
    const text = 'Hello john.doe@example.com here.'
    const result = extractPII(text)
    expect(result.fields.email).toBe('john.doe@example.com')
    expect(result.confidence.email).toBeGreaterThanOrEqual(0)
    expect(result.confidence.email).toBeLessThanOrEqual(1)
    expect(result.fields.name).toBeUndefined()
    expect(result.fields.phone).toBeUndefined()
  })

  it('extracts phone only', () => {
    const text = 'Call me at +12345678901 anytime.'
    const result = extractPII(text)
    expect(result.fields.phone).toBe('+12345678901')
    expect(result.confidence.phone).toBeGreaterThanOrEqual(0)
    expect(result.confidence.phone).toBeLessThanOrEqual(1)
    expect(result.fields.email).toBeUndefined()
    expect(result.fields.name).toBeUndefined()
  })

  it('extracts name from first line', () => {
    const text = 'Jane Smith\nSome other content.'
    const result = extractPII(text)
    expect(result.fields.name).toBe('Jane Smith')
    expect(result.confidence.name).toBeGreaterThanOrEqual(0)
    expect(result.confidence.name).toBeLessThanOrEqual(1)
  })

  it('extracts all fields together', () => {
    const text = 'Alice Johnson\njane@example.com\n+19876543210\nContent.'
    const result = extractPII(text)
    expect(result.fields.name).toBe('Alice Johnson')
    expect(result.fields.email).toBe('jane@example.com')
    expect(result.fields.phone).toBe('+19876543210')
    Object.values(result.confidence).forEach(c => {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    })
  })
})
