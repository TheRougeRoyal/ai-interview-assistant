/**
 * Unit tests for Fallback strategies
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FallbackHandler, DEFAULT_FALLBACK_CONFIG } from '../fallback'
import { ErrorCodes } from '@/lib/errors/types'

describe('FallbackHandler', () => {
  let handler: FallbackHandler

  beforeEach(() => {
    handler = new FallbackHandler({
      ...DEFAULT_FALLBACK_CONFIG,
      strategy: 'mock'
    })
    handler.clearCache()
  })

  describe('Question Fallback', () => {
    it('should return mock question on failure', async () => {
      const payload = {
        difficulty: 'medium',
        role: 'Software Engineer'
      }
      
      const result = await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(result).toHaveProperty('prompt')
      expect(typeof result.prompt).toBe('string')
      expect(result.prompt.length).toBeGreaterThan(0)
    })

    it('should use cached result if available', async () => {
      const payload = {
        difficulty: 'easy',
        role: 'Developer'
      }
      
      const mockResult = { prompt: 'Cached question' }
      handler.cacheResult('generate_question', payload, mockResult, 'test-correlation-id')
      
      const result = await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(result.prompt).toBe('Cached question')
    })

    it('should return degraded question when strategy is degraded', async () => {
      handler = new FallbackHandler({
        strategy: 'degraded',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = {
        difficulty: 'hard',
        role: 'Data Scientist'
      }
      
      const result = await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.AI_SERVICE_ERROR, message: 'error' }
      )
      
      expect(result.prompt).toContain('Data Scientist')
    })
  })

  describe('Score Fallback', () => {
    it('should return mock score on failure', async () => {
      const payload = {
        question: 'What is REST?',
        answer: 'REST is...',
        durationMs: 300000,
        timeTakenMs: 120000
      }
      
      const result = await handler.handleScoreFallback(
        payload,
        { code: ErrorCodes.OPENAI_ERROR, message: 'api error' }
      )
      
      expect(result).toHaveProperty('accuracy')
      expect(result).toHaveProperty('completeness')
      expect(result).toHaveProperty('relevance')
      expect(result).toHaveProperty('timeliness')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('rationale')
      
      expect(typeof result.accuracy).toBe('number')
      expect(result.accuracy).toBeGreaterThanOrEqual(0)
      expect(result.accuracy).toBeLessThanOrEqual(100)
    })

    it('should return degraded score with neutral values', async () => {
      handler = new FallbackHandler({
        strategy: 'degraded',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = {
        question: 'Explain OOP',
        answer: 'OOP is...',
        durationMs: 300000,
        timeTakenMs: 150000
      }
      
      const result = await handler.handleScoreFallback(
        payload,
        { code: ErrorCodes.SERVICE_UNAVAILABLE, message: 'unavailable' }
      )
      
      expect(result.accuracy).toBe(50)
      expect(result.completeness).toBe(50)
      expect(result.relevance).toBe(50)
      expect(result.timeliness).toBe(50)
      expect(result.total).toBe(50)
      expect(result.rationale).toContain('fallback')
    })

    it('should use cached score if available', async () => {
      const payload = {
        question: 'Test question',
        answer: 'Test answer',
        durationMs: 300000,
        timeTakenMs: 100000
      }
      
      const mockScore = {
        accuracy: 85,
        completeness: 90,
        relevance: 88,
        timeliness: 75,
        total: 86,
        rationale: 'Cached score'
      }
      
      handler.cacheResult('score', payload, mockScore, 'test-id')
      
      const result = await handler.handleScoreFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(result).toEqual(mockScore)
    })
  })

  describe('Summary Fallback', () => {
    it('should return mock summary on failure', async () => {
      const payload = {
        rubrics: [
          {
            accuracy: 80,
            completeness: 75,
            relevance: 85,
            timeliness: 70,
            total: 78,
            rationale: 'Good answer'
          },
          {
            accuracy: 90,
            completeness: 85,
            relevance: 80,
            timeliness: 75,
            total: 84,
            rationale: 'Very good answer'
          }
        ]
      }
      
      const result = await handler.handleSummaryFallback(
        payload,
        { code: ErrorCodes.AI_SERVICE_ERROR, message: 'error' }
      )
      
      expect(result).toHaveProperty('finalScore')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('strengths')
      expect(result).toHaveProperty('gap')
      
      expect(typeof result.finalScore).toBe('number')
      expect(Array.isArray(result.strengths)).toBe(true)
    })

    it('should calculate basic summary in degraded mode', async () => {
      handler = new FallbackHandler({
        strategy: 'degraded',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = {
        rubrics: [
          {
            accuracy: 60,
            completeness: 70,
            relevance: 65,
            timeliness: 55,
            total: 64,
            rationale: 'Average answer'
          }
        ]
      }
      
      const result = await handler.handleSummaryFallback(
        payload,
        { code: ErrorCodes.SERVICE_UNAVAILABLE, message: 'unavailable' }
      )
      
      expect(result.finalScore).toBe(64)
      expect(result.summary).toContain('service issues')
    })
  })

  describe('Resume Analysis Fallback', () => {
    it('should return mock analysis on failure', async () => {
      const payload = {
        resumeText: 'John Doe, Software Engineer with 5 years experience in Python and JavaScript...'
      }
      
      const result = await handler.handleResumeAnalysisFallback(
        payload,
        { code: ErrorCodes.OPENAI_ERROR, message: 'api error' }
      )
      
      expect(result).toHaveProperty('skills')
      expect(result).toHaveProperty('experience_years')
      expect(result).toHaveProperty('seniority_level')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('strengths')
      expect(result).toHaveProperty('quality_score')
      
      expect(result.skills).toHaveProperty('technical')
      expect(result.skills).toHaveProperty('soft')
      expect(Array.isArray(result.skills.technical)).toBe(true)
    })

    it('should return minimal analysis in degraded mode', async () => {
      handler = new FallbackHandler({
        strategy: 'degraded',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = {
        resumeText: 'Basic resume text'
      }
      
      const result = await handler.handleResumeAnalysisFallback(
        payload,
        { code: ErrorCodes.AI_SERVICE_ERROR, message: 'error' }
      )
      
      expect(result.experience_years).toBe(3)
      expect(result.seniority_level).toBe('mid')
      expect(result.quality_score).toBe(50)
      expect(result.summary).toContain('unavailable')
    })
  })

  describe('Caching', () => {
    it('should cache successful results', () => {
      const payload = { test: 'data' }
      const result = { test: 'result' }
      
      handler.cacheResult('generate_question', payload, result, 'corr-123')
      
      const stats = handler.getCacheStats()
      expect(stats.size).toBe(1)
    })

    it('should retrieve cached results', async () => {
      const payload = { difficulty: 'easy', role: 'Engineer' }
      const cachedQuestion = { prompt: 'Cached question prompt' }
      
      handler.cacheResult('generate_question', payload, cachedQuestion, 'corr-456')
      
      const result = await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(result).toEqual(cachedQuestion)
    })

    it('should clear cache', () => {
      handler.cacheResult('generate_question', {}, { prompt: 'test' }, 'id')
      
      expect(handler.getCacheStats().size).toBe(1)
      
      handler.clearCache()
      
      expect(handler.getCacheStats().size).toBe(0)
    })

    it('should not cache when caching is disabled', async () => {
      handler = new FallbackHandler({
        strategy: 'mock',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = { difficulty: 'easy', role: 'Dev' }
      
      await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(handler.getCacheStats().size).toBe(0)
    })
  })

  describe('Strategy: None', () => {
    it('should throw error when strategy is none', async () => {
      handler = new FallbackHandler({
        strategy: 'none',
        enableCaching: false,
        cacheTimeout: 0
      })
      
      const payload = { difficulty: 'easy', role: 'Dev' }
      const error = { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      
      await expect(
        handler.handleQuestionFallback(payload, error)
      ).rejects.toEqual(error)
    })
  })

  describe('Strategy: Cached', () => {
    it('should throw error when no cache available', async () => {
      handler = new FallbackHandler({
        strategy: 'cached',
        enableCaching: true,
        cacheTimeout: 300000
      })
      
      const payload = { difficulty: 'easy', role: 'Dev' }
      
      await expect(
        handler.handleQuestionFallback(
          payload,
          { code: ErrorCodes.TIMEOUT, message: 'timeout' }
        )
      ).rejects.toMatchObject({
        code: ErrorCodes.AI_SERVICE_ERROR
      })
    })

    it('should return cached result when available', async () => {
      handler = new FallbackHandler({
        strategy: 'cached',
        enableCaching: true,
        cacheTimeout: 300000
      })
      
      const payload = { difficulty: 'easy', role: 'Dev' }
      const cachedQuestion = { prompt: 'From cache' }
      
      handler.cacheResult('generate_question', payload, cachedQuestion, 'id')
      
      const result = await handler.handleQuestionFallback(
        payload,
        { code: ErrorCodes.TIMEOUT, message: 'timeout' }
      )
      
      expect(result).toEqual(cachedQuestion)
    })
  })
})
