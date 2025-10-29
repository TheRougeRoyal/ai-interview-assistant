import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ask } from '@/lib/ai/gateway'

const mockAsk = vi.mocked(ask)

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function makeFormRequest(formData: FormData): Request {
  return new Request('http://localhost:3000/api/parse-resume', {
    method: 'POST',
    body: formData,
  })
}

/** Helper to create a GET request */
function makeGetRequest(url = 'http://localhost:3000/api/health'): Request {
  return new Request(url, { method: 'GET' })
}

describe('API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('returns 200 with ok, vendor, and model', async () => {
      const { GET } = await import('@/app/api/health/route')
      
      const response = await GET()
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        ok: true,
        vendor: expect.any(String),
        model: expect.any(String),
        timestamp: expect.any(String),
      })
    })
  })

  describe('POST /api/generate-question', () => {
    it('returns 200 and correct difficulty/duration for valid input', async () => {
      mockAsk.mockResolvedValueOnce({ prompt: 'Describe a time you built a REST API.' })
      const { POST } = await import('@/app/api/generate-question/route')
      const request = makeRequest({ questionIndex: 2, role: 'fullstack' })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        prompt: expect.any(String),
        difficulty: 'medium',
        targetDurationMs: 60000,
      })
      expect(mockAsk).toHaveBeenCalledWith('generate_question', expect.objectContaining({ difficulty: 'medium', role: 'fullstack' }))
    })

    it('returns 422 on out-of-range questionIndex', async () => {
      const { POST } = await import('@/app/api/generate-question/route')
      const request = makeRequest({ questionIndex: 7, role: 'fullstack' })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(422)
      expect(data.error.code).toBe('SCHEMA_VALIDATION_FAILED')
    })

    it('rate limiting is disabled in tests (returns 200 instead of 429)', async () => {
      mockAsk.mockResolvedValue({ prompt: 'Test question' })
      const { POST } = await import('@/app/api/generate-question/route')
      const validBody = { questionIndex: 0, role: 'Developer' }
      for (let i = 0; i < 15; i++) {
        const request = makeRequest(validBody, { 'x-forwarded-for': '127.0.0.1' })
        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })
  })

  describe('POST /api/score-answer', () => {
    it('returns 200 on valid input including difficulty & questionIndex', async () => {
      mockAsk.mockResolvedValueOnce({
        accuracy: 80,
        completeness: 85,
        relevance: 82,
        timeliness: 90,
        total: 84,
        rationale: 'Solid answer with clear structure.'
      })
      const { POST } = await import('@/app/api/score-answer/route')
      const request = makeRequest({
        questionIndex: 1,
        question: 'Describe the difference between REST and GraphQL?',
        answer: 'REST is resource-based, GraphQL is query-based allowing clients to shape responses.',
        durationMs: 60000,
        timeTakenMs: 45000,
        difficulty: 'easy',
        resumeContext: 'Fullstack engineer'
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.questionIndex).toBe(1)
      expect(data).toHaveProperty('accuracy')
      expect(mockAsk).toHaveBeenCalledWith('score', expect.objectContaining({ difficulty: 'easy' }))
    })

    it('returns 422 when difficulty missing', async () => {
      const { POST } = await import('@/app/api/score-answer/route')
      const request = makeRequest({
        questionIndex: 0,
        question: 'Test question about systems?',
        answer: 'Test answer',
        durationMs: 60000,
        timeTakenMs: 30000,
        // difficulty omitted
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(422)
      expect(data.error.code).toBe('SCHEMA_VALIDATION_FAILED')
    })

    it('returns 400 on malformed JSON', async () => {
      const { POST } = await import('@/app/api/score-answer/route')
      // Send a request with invalid JSON body by constructing without JSON header & invalid body type
      const badReq = new Request('http://localhost:3000/api/score-answer', { method: 'POST', body: 'not-json{' })
      const response = await POST(badReq)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_JSON')
    })

    it('returns 422 when timeTakenMs > durationMs', async () => {
      const { POST } = await import('@/app/api/score-answer/route')
      const request = makeRequest({
        questionIndex: 2,
        question: 'Test question?',
        answer: 'Test answer',
        durationMs: 60000,
        timeTakenMs: 90000,
        difficulty: 'medium'
      })
      const response = await POST(request)
      const data = await response.json()
      expect(response.status).toBe(422)
      expect(data.error.code).toBe('SCHEMA_VALIDATION_FAILED')
    })
  })

  describe('POST /api/summary', () => {
    it('returns 200 with valid rubrics array', async () => {
      // Mock successful AI response
      mockAsk.mockResolvedValueOnce({
        finalScore: 87,
        summary: 'Candidate demonstrated strong technical knowledge and good communication skills.',
        strengths: ['Strong technical knowledge', 'Good communication'],
        gap: 'Could provide more specific examples',
      })

      const { POST } = await import('@/app/api/summary/route')
      
      const request = makeRequest({
        rubrics: [
          {
            accuracy: 85,
            completeness: 90,
            relevance: 88,
            timeliness: 95,
            total: 89,
            rationale: 'Good comprehensive answer.',
          },
        ],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockAsk).toHaveBeenCalledWith('summary', expect.objectContaining({
        rubrics: expect.arrayContaining([
          expect.objectContaining({
            accuracy: 85,
            total: 89,
          }),
        ]),
      }))
    })

    it('returns 422 with empty rubrics array', async () => {
      const { POST } = await import('@/app/api/summary/route')
      
      const request = makeRequest({
        rubrics: [], // Empty array should fail validation
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('SCHEMA_VALIDATION_FAILED')
    })
  })

  describe('POST /api/parse-resume', () => {
    it('returns 400 when file is missing', async () => {
      const { POST } = await import('@/app/api/parse-resume/route')

      const request = makeFormRequest(new FormData())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_FILE')
    })

    it('returns 415 for unsupported mime type', async () => {
      const { POST } = await import('@/app/api/parse-resume/route')

      const form = new FormData()
      form.append('file', new File(['hello'], 'resume.txt', { type: 'text/plain' }))

      const request = makeFormRequest(form)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(415)
      expect(data.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
    })
  })
})
