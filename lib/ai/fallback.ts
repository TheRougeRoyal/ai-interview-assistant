/**
 * Fallback Strategies for AI Service Failures
 * Provides graceful degradation when AI services are unavailable
 */

import { getAiServiceLogger } from '../logging'
import { ErrorCodes } from '../errors/types'
import * as mockVendor from './vendors/mock'
import type { Question } from './schemas/question'
import type { Rubric } from './schemas/rubric'
import type { Summary } from './schemas/summary'
import type { ResumeAnalysis } from './schemas/resume'

const logger = getAiServiceLogger()

export type FallbackStrategy = 'mock' | 'cached' | 'degraded' | 'none'

export interface FallbackConfig {
  strategy: FallbackStrategy
  enableCaching: boolean
  cacheTimeout: number // milliseconds
}

export interface CachedResult<T> {
  data: T
  timestamp: number
  correlationId: string
}

/**
 * Simple in-memory cache for AI results
 */
class ResultCache {
  private cache = new Map<string, CachedResult<any>>()
  private maxSize = 100
  private ttl: number

  constructor(ttl: number = 300000) { // 5 minutes default
    this.ttl = ttl
  }

  /**
   * Generate cache key from task and payload
   */
  private generateKey(task: string, payload: any): string {
    try {
      return `${task}:${JSON.stringify(payload)}`
    } catch {
      // If payload can't be stringified, use task + timestamp as key
      return `${task}:${Date.now()}`
    }
  }

  /**
   * Get cached result if available and not expired
   */
  get<T>(task: string, payload: any): T | null {
    const key = this.generateKey(task, payload)
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      logger.debug('Cache entry expired', { task, key })
      return null
    }

    logger.info('Cache hit', { task, key, age: Date.now() - cached.timestamp })
    return cached.data as T
  }

  /**
   * Store result in cache
   */
  set<T>(task: string, payload: any, data: T, correlationId: string): void {
    const key = this.generateKey(task, payload)

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
        logger.debug('Cache eviction', { evictedKey: oldestKey })
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      correlationId
    })

    logger.debug('Cache set', { task, key, size: this.cache.size })
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
    logger.info('Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }
}

// Global cache instance
const resultCache = new ResultCache()

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  strategy: 'mock',
  enableCaching: true,
  cacheTimeout: 300000 // 5 minutes
}

/**
 * Fallback handler for AI service failures
 */
export class FallbackHandler {
  constructor(private config: FallbackConfig = DEFAULT_FALLBACK_CONFIG) {
    logger.info('Fallback handler initialized', { config })
  }

  /**
   * Handle fallback for generate_question task
   */
  async handleQuestionFallback(payload: any, error: any): Promise<Question> {
    logger.warn('Falling back for generate_question', {
      strategy: this.config.strategy,
      error: error.message || String(error)
    })

    // Try cache first if enabled
    if (this.config.enableCaching) {
      const cached = resultCache.get<Question>('generate_question', payload)
      if (cached) {
        return cached
      }
    }

    // Use strategy
    switch (this.config.strategy) {
      case 'mock':
        return mockVendor.generate_question(payload)
      
      case 'degraded':
        // Return a simple fallback question
        return {
          prompt: `Tell me about your experience with ${payload.role || 'software development'}.`
        }
      
      case 'cached':
        // If caching is enabled but no cache hit, throw error
        throw {
          code: ErrorCodes.AI_SERVICE_ERROR,
          message: 'AI service unavailable and no cached result available'
        }
      
      case 'none':
      default:
        throw error
    }
  }

  /**
   * Handle fallback for score task
   */
  async handleScoreFallback(payload: any, error: any): Promise<Rubric> {
    logger.warn('Falling back for score', {
      strategy: this.config.strategy,
      error: error.message || String(error)
    })

    // Try cache first if enabled
    if (this.config.enableCaching) {
      const cached = resultCache.get<Rubric>('score', payload)
      if (cached) {
        return cached
      }
    }

    // Use strategy
    switch (this.config.strategy) {
      case 'mock':
        return mockVendor.score(payload)
      
      case 'degraded':
        // Return a neutral score
        return {
          accuracy: 50,
          completeness: 50,
          relevance: 50,
          timeliness: 50,
          total: 50,
          rationale: 'Score generated using fallback due to AI service unavailability.'
        }
      
      case 'cached':
        throw {
          code: ErrorCodes.AI_SERVICE_ERROR,
          message: 'AI service unavailable and no cached result available'
        }
      
      case 'none':
      default:
        throw error
    }
  }

  /**
   * Handle fallback for summary task
   */
  async handleSummaryFallback(payload: any, error: any): Promise<Summary> {
    logger.warn('Falling back for summary', {
      strategy: this.config.strategy,
      error: error.message || String(error)
    })

    // Try cache first if enabled
    if (this.config.enableCaching) {
      const cached = resultCache.get<Summary>('summary', payload)
      if (cached) {
        return cached
      }
    }

    // Use strategy
    switch (this.config.strategy) {
      case 'mock':
        return mockVendor.summary(payload)
      
      case 'degraded':
        // Calculate basic summary from rubrics
        const rubrics = payload.rubrics || []
        const avgScore = rubrics.length > 0
          ? Math.round(rubrics.reduce((sum: number, r: Rubric) => sum + r.total, 0) / rubrics.length)
          : 50
        
        return {
          finalScore: avgScore,
          summary: 'Interview completed. Detailed analysis unavailable due to service issues.',
          strengths: ['Technical knowledge', 'Communication'],
          gap: 'Unable to provide detailed gap analysis at this time.'
        }
      
      case 'cached':
        throw {
          code: ErrorCodes.AI_SERVICE_ERROR,
          message: 'AI service unavailable and no cached result available'
        }
      
      case 'none':
      default:
        throw error
    }
  }

  /**
   * Handle fallback for analyze_resume task
   */
  async handleResumeAnalysisFallback(payload: any, error: any): Promise<ResumeAnalysis> {
    logger.warn('Falling back for analyze_resume', {
      strategy: this.config.strategy,
      error: error.message || String(error)
    })

    // Try cache first if enabled
    if (this.config.enableCaching) {
      const cached = resultCache.get<ResumeAnalysis>('analyze_resume', payload)
      if (cached) {
        return cached
      }
    }

    // Use strategy
    switch (this.config.strategy) {
      case 'mock':
        return mockVendor.analyze_resume(payload)
      
      case 'degraded':
        // Return minimal resume analysis
        return {
          skills: {
            technical: ['General technical skills'],
            soft: ['Communication', 'Problem solving'],
            languages: ['English'],
            frameworks: [],
            tools: [],
            certifications: [],
            domains: []
          },
          experience_years: 3,
          seniority_level: 'mid',
          summary: 'Resume analysis unavailable. Please review the resume manually.',
          strengths: ['Professional experience', 'Educational background'],
          quality_score: 50
        }
      
      case 'cached':
        throw {
          code: ErrorCodes.AI_SERVICE_ERROR,
          message: 'AI service unavailable and no cached result available'
        }
      
      case 'none':
      default:
        throw error
    }
  }

  /**
   * Cache a successful result
   */
  cacheResult<T>(task: string, payload: any, result: T, correlationId: string): void {
    if (this.config.enableCaching) {
      resultCache.set(task, payload, result, correlationId)
    }
  }

  /**
   * Clear the result cache
   */
  clearCache(): void {
    resultCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return resultCache.getStats()
  }
}

// Global fallback handler
export const fallbackHandler = new FallbackHandler()
