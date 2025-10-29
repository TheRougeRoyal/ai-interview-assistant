/**
 * Robust API client integration with existing system
 */

import { 
  EnhancedApiClient, 
  apiClient, 
  createServiceClient,
  InterceptorUtils,
  ApiUtils,
  type ApiClientConfig,
  type RequestOptions,
  type ApiResponse
} from '@/store/enhanced/apiClient'
import { 
  createCandidate as legacyCreateCandidate,
  createSession as legacyCreateSession,
  upsertAnswer as legacyUpsertAnswer,
  finalizeCandidate as legacyFinalizeCandidate,
  PERSIST_TO_API
} from '@/lib/http/apiClient'
import { getApiLogger } from '@/lib/logging'
import { generateCorrelationId } from '@/lib/errors/correlation'
import type { ApiError } from '@/lib/errors'

/**
 * Enhanced API client specifically configured for the AI Interview Assistant
 */
class InterviewApiClient extends EnhancedApiClient {
  private logger = getApiLogger()

  constructor() {
    super({
      baseUrl: '',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      retryBackoff: 2,
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 60000
      }
    })

    this.setupInterceptors()
  }

  /**
   * Set up default interceptors for the interview system
   */
  private setupInterceptors() {
    // Request interceptor for authentication and correlation
    this.addRequestInterceptor(async (config) => {
      // Add correlation ID if not present
      if (!config.correlationId) {
        config.correlationId = generateCorrelationId()
      }

      // Add system headers
      config.headers = {
        ...config.headers,
        'X-Client-Type': 'interview-assistant',
        'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        'X-Correlation-ID': config.correlationId
      }

      // Add authentication if available
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
      }

      this.logger.debug('API request prepared', {
        method: config.method,
        url: config.url,
        correlationId: config.correlationId
      })

      return config
    })

    // Response interceptor for token refresh and logging
    this.addResponseInterceptor(async (response) => {
      this.logger.debug('API response received', {
        status: response.status,
        correlationId: response.correlationId
      })

      // Handle token refresh on 401
      if (response.status === 401 && typeof window !== 'undefined') {
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          })
          
          if (refreshResponse.ok) {
            const { token } = await refreshResponse.json()
            localStorage.setItem('auth_token', token)
            this.logger.info('Token refreshed successfully')
          } else {
            this.logger.warn('Token refresh failed, redirecting to login')
            window.location.href = '/login'
          }
        } catch (error) {
          this.logger.error('Token refresh error', error)
          window.location.href = '/login'
        }
      }

      return response
    })

    // Error interceptor for enhanced error handling
    this.addErrorInterceptor(async (error) => {
      this.logger.error('API request failed', error, {
        correlationId: error.correlationId
      })

      // Add user-friendly error messages
      if (error.code === 'NETWORK_ERROR') {
        error.message = 'Network connection failed. Please check your internet connection and try again.'
      } else if (error.details?.status === 429) {
        error.message = 'Too many requests. Please wait a moment before trying again.'
      } else if (error.details?.status === 500) {
        error.message = 'Server error occurred. Our team has been notified.'
      }

      return error
    })
  }

  /**
   * Enhanced candidate operations with fallback to legacy API
   */
  async createCandidate(data: {
    name: string
    email: string
    phone: string
    resumeMeta?: {
      filename: string
      size: number
      mime: string
    }
    resumeText?: string
  }): Promise<ApiResponse<any>> {
    const correlationId = generateCorrelationId()

    try {
      if (!PERSIST_TO_API) {
        // Use legacy mock implementation
        const result = await legacyCreateCandidate(data)
        return {
          data: result,
          status: 200,
          headers: new Headers(),
          correlationId
        }
      }

      return await this.post('/api/candidates', data, { correlationId })
    } catch (error) {
      this.logger.error('Failed to create candidate', error, { correlationId })
      throw error
    }
  }

  /**
   * Enhanced session operations
   */
  async createSession(data: {
    candidateId: string
    plan: Array<{
      index: number
      difficulty: 'easy' | 'medium' | 'hard'
      targetDurationMs: number
    }>
  }): Promise<ApiResponse<any>> {
    const correlationId = generateCorrelationId()

    try {
      if (!PERSIST_TO_API) {
        const result = await legacyCreateSession(data)
        return {
          data: result,
          status: 200,
          headers: new Headers(),
          correlationId
        }
      }

      return await this.post('/api/sessions', data, { correlationId })
    } catch (error) {
      this.logger.error('Failed to create session', error, { correlationId })
      throw error
    }
  }

  /**
   * Enhanced answer operations with optimistic updates
   */
  async upsertAnswer(
    sessionId: string, 
    data: {
      questionIndex: number
      difficulty: string
      question: string
      answerText?: string
      durationMs: number
      timeTakenMs?: number
      rubric?: {
        accuracy: number
        completeness: number
        relevance: number
        timeliness: number
        total: number
        rationale: string
      }
      submittedAt: string
    },
    options: {
      optimistic?: boolean
      onRollback?: () => void
    } = {}
  ): Promise<ApiResponse<any>> {
    const correlationId = generateCorrelationId()

    try {
      if (!PERSIST_TO_API) {
        const result = await legacyUpsertAnswer(sessionId, data)
        return {
          data: result,
          status: 200,
          headers: new Headers(),
          correlationId
        }
      }

      if (options.optimistic) {
        return await this.optimisticRequest(`/api/sessions/${sessionId}/answers`, {
          method: 'POST',
          body: JSON.stringify(data),
          correlationId,
          optimisticData: {
            id: `temp-${Date.now()}`,
            sessionId,
            ...data
          },
          rollbackFn: options.onRollback
        })
      }

      return await this.post(`/api/sessions/${sessionId}/answers`, data, { correlationId })
    } catch (error) {
      this.logger.error('Failed to upsert answer', error, { correlationId, sessionId })
      throw error
    }
  }

  /**
   * Enhanced candidate finalization
   */
  async finalizeCandidate(data: {
    id: string
    finalScore: number
    summary: string
    strengths: string[]
    gap: string
  }): Promise<ApiResponse<any>> {
    const correlationId = generateCorrelationId()

    try {
      if (!PERSIST_TO_API) {
        const result = await legacyFinalizeCandidate(data)
        return {
          data: result,
          status: 200,
          headers: new Headers(),
          correlationId
        }
      }

      return await this.patch(`/api/candidates/${data.id}`, data, { correlationId })
    } catch (error) {
      this.logger.error('Failed to finalize candidate', error, { correlationId, candidateId: data.id })
      throw error
    }
  }

  /**
   * Batch operations for multiple entities
   */
  async batchCreateCandidates(candidates: Array<{
    name: string
    email: string
    phone: string
    resumeText?: string
  }>): Promise<Array<ApiResponse<any> | ApiError>> {
    return await this.batch(
      candidates.map(candidate => ({
        url: '/api/candidates',
        options: {
          method: 'POST' as const,
          body: JSON.stringify(candidate)
        }
      })),
      {
        concurrency: 3,
        failFast: false,
        onProgress: (completed, total) => {
          this.logger.debug('Batch create progress', { completed, total })
        }
      }
    )
  }

  /**
   * Real-time session monitoring
   */
  createSessionMonitor(sessionId: string, onUpdate: (session: any) => void) {
    return ApiUtils.createRealTimeUpdates(
      this,
      `/api/sessions/${sessionId}`,
      {
        interval: 5000,
        onUpdate,
        onError: (error) => {
          this.logger.error('Session monitoring error', error, { sessionId })
        }
      }
    )
  }

  /**
   * File upload with progress tracking
   */
  async uploadResume(
    file: File,
    candidateId: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<any>> {
    return await this.upload('/api/candidates/resume', file, {
      onProgress,
      additionalData: { candidateId },
      timeout: 60000 // 1 minute for file uploads
    })
  }

  /**
   * Search candidates with debouncing
   */
  createCandidateSearch() {
    return ApiUtils.createDebouncedSearch(
      this,
      '/api/candidates/search',
      {
        delay: 300,
        minLength: 2,
        cacheResults: true
      }
    )
  }

  /**
   * Infinite scroll for candidates
   */
  createCandidateLoader() {
    return ApiUtils.createInfiniteLoader(
      this,
      '/api/candidates',
      {
        limit: 20
      }
    )
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse<{
    status: string
    timestamp: string
    services: Record<string, string>
  }>> {
    return await this.get('/api/health', {
      timeout: 5000,
      retries: 1
    })
  }

  /**
   * Get API metrics
   */
  getApiMetrics() {
    return {
      ...this.getMetrics(),
      circuitBreaker: this.getCircuitBreakerState()
    }
  }
}

/**
 * Default robust API client instance
 */
export const robustApiClient = new InterviewApiClient()

/**
 * Resource managers for different entities
 */
export const candidatesApi = ApiUtils.createResourceManager(robustApiClient, '/api/candidates')
export const sessionsApi = ApiUtils.createResourceManager(robustApiClient, '/api/sessions')
export const answersApi = ApiUtils.createResourceManager(robustApiClient, '/api/answers')

/**
 * Specialized service clients
 */
export const aiServiceClient = createServiceClient('ai-service', process.env.NEXT_PUBLIC_AI_SERVICE_URL || '')
export const fileServiceClient = createServiceClient('file-service', process.env.NEXT_PUBLIC_FILE_SERVICE_URL || '')

/**
 * Utility functions for common operations
 */
export const RobustApiUtils = {
  /**
   * Create optimistic candidate update
   */
  async updateCandidateOptimistically(
    id: string,
    updates: any,
    rollbackFn: () => void
  ): Promise<ApiResponse<any>> {
    return await robustApiClient.optimisticRequest(`/api/candidates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      optimisticData: { id, ...updates },
      rollbackFn: (error) => {
        console.error('Optimistic update failed:', error)
        rollbackFn()
      }
    })
  },

  /**
   * Poll for job completion
   */
  async pollJobStatus(
    jobId: string,
    onUpdate?: (status: any) => void
  ): Promise<ApiResponse<any>> {
    return await robustApiClient.poll(`/api/jobs/${jobId}`, {
      interval: 2000,
      maxAttempts: 30,
      condition: (data) => data.status === 'completed' || data.status === 'failed',
      onUpdate: onUpdate ? (data, attempt) => onUpdate(data) : undefined
    })
  },

  /**
   * Batch process files
   */
  async batchProcessFiles(
    files: File[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<ApiResponse<any> | ApiError>> {
    const uploadRequests = files.map(file => ({
      url: '/api/files/process',
      options: {
        method: 'POST' as const,
        body: file
      }
    }))

    return await robustApiClient.batch(uploadRequests, {
      concurrency: 2, // Limit concurrent file uploads
      onProgress
    })
  }
}

/**
 * Export the enhanced API client for backward compatibility
 */
export { robustApiClient as apiClient }
export default robustApiClient