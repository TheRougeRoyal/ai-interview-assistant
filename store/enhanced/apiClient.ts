/**
 * Robust API client with automatic retry, error handling, interceptors, and optimistic updates
 */

import { APIError, fetchAPI as baseFetchAPI } from '@/lib/http/apiClient'
import { generateCorrelationId, getCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'
import type { ApiError } from '@/lib/errors'

/**
 * Request interceptor function type
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (response: ApiResponse) => ApiResponse | Promise<ApiResponse>

/**
 * Error interceptor function type
 */
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

/**
 * API client configuration
 */
export interface ApiClientConfig {
  baseUrl?: string
  timeout?: number
  retries?: number
  retryDelay?: number
  retryBackoff?: number
  circuitBreaker?: CircuitBreakerConfig
  enableMetrics?: boolean
  enableCaching?: boolean
  cacheTimeout?: number
}

/**
 * Request configuration
 */
export interface RequestConfig extends RequestInit {
  url: string
  timeout?: number
  retries?: number
  correlationId?: string
  optimistic?: boolean
  skipInterceptors?: boolean
  cacheKey?: string
  cacheTtl?: number
}

/**
 * Request options
 */
export interface RequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  correlationId?: string
  optimistic?: boolean
  skipInterceptors?: boolean
  cacheKey?: string
  cacheTtl?: number
}

/**
 * Response wrapper
 */
export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Headers
  correlationId: string
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime: number
  nextAttemptTime: number
}

/**
 * Request cache entry
 */
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

/**
 * Enhanced API client with retry logic, interceptors, circuit breaker, and caching
 */
export class EnhancedApiClient {
  private config: Required<ApiClientConfig & { circuitBreaker: Required<CircuitBreakerConfig> }>
  private logger = getApiLogger()
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []
  private circuitBreaker: CircuitBreakerState
  private cache = new Map<string, CacheEntry>()
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  }

  constructor(config: ApiClientConfig = {}) {
    this.config = {
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
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 60000 // 1 minute
      },
      ...config
    }

    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    }

    // Set up cache cleanup interval
    if (this.config.enableCaching) {
      setInterval(() => this.cleanupCache(), 60000) // Cleanup every minute
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor)
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor)
      if (index > -1) {
        this.requestInterceptors.splice(index, 1)
      }
    }
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor)
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor)
      if (index > -1) {
        this.responseInterceptors.splice(index, 1)
      }
    }
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor)
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor)
      if (index > -1) {
        this.errorInterceptors.splice(index, 1)
      }
    }
  }

  /**
   * Get client metrics
   */
  getMetrics() {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get circuit breaker state
   */
  getCircuitBreakerState() {
    return { ...this.circuitBreaker }
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker = {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    }
  }

  /**
   * Make a request with retry logic, interceptors, and circuit breaker
   */
  async request<T = any>(
    url: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const startTime = performance.now()
    
    if (this.config.enableMetrics) {
      this.metrics.totalRequests++
    }

    try {
      // Check circuit breaker
      this.checkCircuitBreaker()

      // Check cache first
      if (this.config.enableCaching && options.method === 'GET') {
        const cacheKey = options.cacheKey || this.generateCacheKey(url, options)
        const cachedResponse = this.getFromCache<T>(cacheKey)
        if (cachedResponse) {
          if (this.config.enableMetrics) {
            this.metrics.cacheHits++
            this.metrics.successfulRequests++
          }
          return cachedResponse
        }
        if (this.config.enableMetrics) {
          this.metrics.cacheMisses++
        }
      }

      // Prepare request config
      let requestConfig: RequestConfig = {
        url,
        correlationId: options.correlationId || getCorrelationId() || generateCorrelationId(),
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': options.correlationId || getCorrelationId() || generateCorrelationId(),
          ...options.headers
        },
        ...options
      }

      // Apply request interceptors
      if (!options.skipInterceptors) {
        for (const interceptor of this.requestInterceptors) {
          requestConfig = await interceptor(requestConfig)
        }
      }

      // Execute request with retry logic
      const response = await this.executeWithRetry<T>(requestConfig)

      // Apply response interceptors
      if (!options.skipInterceptors) {
        for (const interceptor of this.responseInterceptors) {
          await interceptor(response)
        }
      }

      // Cache successful GET requests
      if (this.config.enableCaching && requestConfig.method === 'GET' && response.status < 400) {
        const cacheKey = requestConfig.cacheKey || this.generateCacheKey(url, options)
        const ttl = requestConfig.cacheTtl || this.config.cacheTimeout
        this.setCache(cacheKey, response, ttl)
      }

      // Update metrics and circuit breaker
      const duration = performance.now() - startTime
      this.updateMetrics(true, duration)
      this.recordSuccess()

      return response
    } catch (error) {
      const duration = performance.now() - startTime
      this.updateMetrics(false, duration)
      this.recordFailure()

      let processedError = this.enhanceError(error as Error, options.correlationId || generateCorrelationId())

      // Apply error interceptors
      if (!options.skipInterceptors) {
        for (const interceptor of this.errorInterceptors) {
          processedError = await interceptor(processedError)
        }
      }

      throw processedError
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const maxRetries = config.retries ?? this.config.retries
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug('API request attempt', {
          url: config.url,
          method: config.method || 'GET',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          correlationId: config.correlationId
        })

        const response = await this.makeRequest(config)
        const data = await this.parseResponse<T>(response)

        this.logger.info('API request successful', {
          url: config.url,
          method: config.method || 'GET',
          status: response.status,
          attempt: attempt + 1,
          correlationId: config.correlationId
        })

        return {
          data,
          status: response.status,
          headers: response.headers,
          correlationId: config.correlationId!
        }
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on client errors (4xx) except 408, 429
        if (this.isClientError(error) && !this.isRetryableClientError(error)) {
          break
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break
        }

        const delay = this.calculateRetryDelay(attempt)
        
        this.logger.warn('API request failed, retrying', {
          url: config.url,
          method: config.method || 'GET',
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          retryDelay: delay,
          error: (error as any)?.message,
          correlationId: config.correlationId
        })

        await this.sleep(delay)
      }
    }

    this.logger.error('API request failed after all retries', lastError, {
      url: config.url,
      method: config.method || 'GET',
      attempts: maxRetries + 1,
      correlationId: config.correlationId
    })

    throw lastError || new Error('Request failed after all retries')
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' })
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T = any>(
    url: string, 
    file: File, 
    options: {
      onProgress?: (progress: number) => void
      additionalData?: Record<string, any>
    } & Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    const { onProgress, additionalData, ...requestOptions } = options
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      
      formData.append('file', file)
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, typeof value === 'string' ? value : JSON.stringify(value))
        })
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText)
            resolve({
              data,
              status: xhr.status,
              headers: new Headers(), // XMLHttpRequest doesn't provide easy access to response headers
              correlationId: requestOptions.correlationId || generateCorrelationId()
            })
          } catch (error) {
            reject(new Error('Failed to parse response'))
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'))
      })

      xhr.open('POST', this.config.baseUrl + url)
      
      // Add headers
      if (requestOptions.headers) {
        Object.entries(requestOptions.headers).forEach(([key, value]) => {
          if (key !== 'Content-Type') { // Let browser set Content-Type for FormData
            xhr.setRequestHeader(key, value as string)
          }
        })
      }
      
      xhr.setRequestHeader('X-Correlation-ID', requestOptions.correlationId || generateCorrelationId())
      xhr.send(formData)
    })
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(config: RequestConfig): Promise<Response> {
    const controller = new AbortController()
    const timeout = config.timeout || this.config.timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      // Use the existing fetchAPI for consistency, but with enhanced error handling
      const fullUrl = this.config.baseUrl + config.url
      
      const response = await fetch(fullUrl, {
        ...config,
        signal: controller.signal,
        credentials: 'include' // Maintain cookie-based auth compatibility
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw await this.createErrorFromResponse(response)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      
      // Convert APIError to our enhanced format
      if (error instanceof APIError) {
        throw this.convertAPIError(error, config.correlationId!)
      }
      
      throw error
    }
  }

  /**
   * Convert legacy APIError to enhanced ApiError
   */
  private convertAPIError(error: APIError, correlationId: string): ApiError {
    return {
      code: `HTTP_${error.code}`,
      message: error.message,
      details: { status: error.code },
      correlationId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): void {
    const now = Date.now()
    
    switch (this.circuitBreaker.state) {
      case 'open':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'half-open'
          this.logger.info('Circuit breaker transitioning to half-open')
        } else {
          throw new Error('Circuit breaker is open - requests are blocked')
        }
        break
      
      case 'half-open':
        // Allow one request through
        break
      
      case 'closed':
        // Normal operation
        break
    }
  }

  /**
   * Record successful request for circuit breaker
   */
  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed'
      this.circuitBreaker.failureCount = 0
      this.logger.info('Circuit breaker reset to closed state')
    }
  }

  /**
   * Record failed request for circuit breaker
   */
  private recordFailure(): void {
    const now = Date.now()
    this.circuitBreaker.failureCount++
    this.circuitBreaker.lastFailureTime = now

    if (this.circuitBreaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'open'
      this.circuitBreaker.nextAttemptTime = now + this.config.circuitBreaker.resetTimeout
      this.logger.warn('Circuit breaker opened due to failures', {
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold
      })
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(success: boolean, duration: number): void {
    if (!this.config.enableMetrics) return

    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
    }

    // Update average response time
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + duration) / totalRequests
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string, options: RequestOptions): string {
    const method = options.method || 'GET'
    const headers = JSON.stringify(options.headers || {})
    const body = options.body || ''
    return `${method}:${url}:${headers}:${body}`
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): ApiResponse<T> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, response: ApiResponse<T>, ttl: number): void {
    this.cache.set(key, {
      data: response,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Parse response data
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      return response.json()
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as any
    }
    
    return response.blob() as any
  }

  /**
   * Create error from response
   */
  private async createErrorFromResponse(response: Response): Promise<ApiError> {
    let errorData: any = {}
    
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = { message: await response.text() }
      }
    } catch {
      errorData = { message: response.statusText }
    }

    return {
      code: errorData.code || `HTTP_${response.status}`,
      message: errorData.message || response.statusText,
      details: errorData.details || { status: response.status },
      correlationId: response.headers.get('X-Correlation-ID') || generateCorrelationId(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: Error, correlationId: string): ApiError {
    if (this.isApiError(error)) {
      return error
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message || 'Network request failed',
      details: { originalError: error.name },
      correlationId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Check if error is an API error
   */
  private isApiError(error: any): error is ApiError {
    return error && 
           typeof error === 'object' && 
           'code' in error && 
           'message' in error && 
           'correlationId' in error
  }

  /**
   * Check if error is a client error (4xx)
   */
  private isClientError(error: any): boolean {
    if (this.isApiError(error) && error.details?.status) {
      const status = error.details.status
      return status >= 400 && status < 500
    }
    return false
  }

  /**
   * Check if client error is retryable
   */
  private isRetryableClientError(error: any): boolean {
    if (this.isApiError(error) && error.details?.status) {
      const status = error.details.status
      return status === 408 || status === 429 // Request Timeout or Too Many Requests
    }
    return false
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelay * Math.pow(this.config.retryBackoff, attempt)
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create optimistic request with enhanced rollback capabilities
   */
  async optimisticRequest<T = any>(
    url: string,
    options: RequestOptions & {
      optimisticData: T
      rollbackFn?: (error: ApiError) => void
      onSuccess?: (data: T) => void
      onError?: (error: ApiError) => void
    }
  ): Promise<ApiResponse<T>> {
    const { optimisticData, rollbackFn, onSuccess, onError, ...requestOptions } = options
    const correlationId = options.correlationId || generateCorrelationId()

    try {
      // Return optimistic data immediately
      const optimisticResponse: ApiResponse<T> = {
        data: optimisticData,
        status: 200,
        headers: new Headers(),
        correlationId
      }

      // Make actual request in background
      this.request<T>(url, { ...requestOptions, optimistic: true, correlationId })
        .then(response => {
          this.logger.debug('Optimistic request succeeded', {
            url,
            correlationId
          })
          if (onSuccess) {
            onSuccess(response.data)
          }
        })
        .catch(error => {
          this.logger.error('Optimistic request failed', error, {
            url,
            correlationId
          })
          
          const apiError = this.isApiError(error) ? error : this.enhanceError(error, correlationId)
          
          if (rollbackFn) {
            rollbackFn(apiError)
          }
          if (onError) {
            onError(apiError)
          }
        })

      return optimisticResponse
    } catch (error) {
      // If optimistic setup fails, make regular request
      this.logger.warn('Optimistic setup failed, falling back to regular request', {
        url,
        correlationId,
        error: (error as Error).message
      })
      return this.request<T>(url, requestOptions)
    }
  }

  /**
   * Batch multiple requests with concurrency control and error handling
   */
  async batch<T = any>(
    requests: Array<{
      url: string
      options?: RequestOptions
    }>,
    options: {
      concurrency?: number
      failFast?: boolean
      onProgress?: (completed: number, total: number) => void
    } = {}
  ): Promise<Array<ApiResponse<T> | ApiError>> {
    const { concurrency = 5, failFast = false, onProgress } = options
    const results: Array<ApiResponse<T> | ApiError> = []
    let completed = 0

    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async ({ url, options: reqOptions }) => {
        try {
          const response = await this.request<T>(url, reqOptions)
          completed++
          if (onProgress) {
            onProgress(completed, requests.length)
          }
          return response
        } catch (error) {
          completed++
          if (onProgress) {
            onProgress(completed, requests.length)
          }
          
          const apiError = this.isApiError(error) ? error : this.enhanceError(error as Error, generateCorrelationId())
          
          if (failFast) {
            throw apiError
          }
          
          return apiError
        }
      })

      try {
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)
      } catch (error) {
        if (failFast) {
          throw error
        }
      }
    }

    return results
  }

  /**
   * Create a request with automatic polling
   */
  async poll<T = any>(
    url: string,
    options: RequestOptions & {
      interval: number
      maxAttempts?: number
      condition: (data: T) => boolean
      onUpdate?: (data: T, attempt: number) => void
    }
  ): Promise<ApiResponse<T>> {
    const { interval, maxAttempts = 10, condition, onUpdate, ...requestOptions } = options
    let attempt = 0

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempt++
          const response = await this.request<T>(url, requestOptions)
          
          if (onUpdate) {
            onUpdate(response.data, attempt)
          }

          if (condition(response.data)) {
            resolve(response)
            return
          }

          if (attempt >= maxAttempts) {
            reject(new Error(`Polling failed after ${maxAttempts} attempts`))
            return
          }

          setTimeout(poll, interval)
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  }

  /**
   * Create a request with timeout and cancellation
   */
  async requestWithCancellation<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<{
    response: Promise<ApiResponse<T>>
    cancel: () => void
  }> {
    const controller = new AbortController()
    
    const requestPromise = this.request<T>(url, {
      ...options,
      signal: controller.signal
    })

    return {
      response: requestPromise,
      cancel: () => controller.abort()
    }
  }
}

/**
 * Default API client instance with common interceptors
 */
export const apiClient = new EnhancedApiClient()

// Add default request interceptor for authentication
apiClient.addRequestInterceptor(async (config) => {
  // Add authentication token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      }
    }
  }
  return config
})

// Add default response interceptor for token refresh
apiClient.addResponseInterceptor(async (response) => {
  // Handle token refresh if needed
  if (response.status === 401 && typeof window !== 'undefined') {
    // Token might be expired, attempt refresh
    try {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (refreshResponse.ok) {
        const { token } = await refreshResponse.json()
        localStorage.setItem('auth_token', token)
      }
    } catch (error) {
      // Refresh failed, redirect to login
      window.location.href = '/login'
    }
  }
  return response
})

// Add default error interceptor for logging
apiClient.addErrorInterceptor(async (error) => {
  // Log errors to external service if needed
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    console.error('API Error:', error)
  }
  return error
})

/**
 * Create API client with custom configuration
 */
export const createApiClient = (config: ApiClientConfig): EnhancedApiClient => {
  return new EnhancedApiClient(config)
}

/**
 * Create API client for specific service
 */
export const createServiceClient = (serviceName: string, baseUrl: string): EnhancedApiClient => {
  const client = new EnhancedApiClient({ baseUrl })
  
  // Add service-specific request interceptor
  client.addRequestInterceptor(async (config) => {
    config.headers = {
      ...config.headers,
      'X-Service': serviceName,
      'X-Client-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    }
    return config
  })
  
  return client
}

/**
 * Interceptor utilities
 */
export const InterceptorUtils = {
  /**
   * Create authentication interceptor
   */
  createAuthInterceptor(getToken: () => string | null): RequestInterceptor {
    return async (config) => {
      const token = getToken()
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`
        }
      }
      return config
    }
  },

  /**
   * Create logging interceptor
   */
  createLoggingInterceptor(logger: any): {
    request: RequestInterceptor
    response: ResponseInterceptor
    error: ErrorInterceptor
  } {
    return {
      request: async (config) => {
        logger.debug('API Request', {
          method: config.method,
          url: config.url,
          correlationId: config.correlationId
        })
        return config
      },
      response: async (response) => {
        logger.debug('API Response', {
          status: response.status,
          correlationId: response.correlationId
        })
        return response
      },
      error: async (error) => {
        logger.error('API Error', error)
        return error
      }
    }
  },

  /**
   * Create retry interceptor
   */
  createRetryInterceptor(maxRetries: number = 3): ErrorInterceptor {
    return async (error) => {
      if (error.details?.retryCount && error.details.retryCount < maxRetries) {
        // This would be handled by the client's retry logic
        // This interceptor can modify the error or add metadata
        error.details.retryable = true
      }
      return error
    }
  },

  /**
   * Create rate limiting interceptor
   */
  createRateLimitInterceptor(): ResponseInterceptor {
    return async (response) => {
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
      const rateLimitReset = response.headers.get('X-RateLimit-Reset')
      
      if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
        console.warn('Rate limit approaching', {
          remaining: rateLimitRemaining,
          reset: rateLimitReset
        })
      }
      
      return response
    }
  }
}

/**
 * Utility functions for common API patterns
 */
export const ApiUtils = {
  /**
   * Create paginated request with cursor support
   */
  async paginate<T>(
    client: EnhancedApiClient,
    url: string,
    options: {
      page?: number
      limit?: number
      cursor?: string
      params?: Record<string, string>
    } = {}
  ): Promise<{
    data: T[]
    pagination: {
      page?: number
      limit: number
      total?: number
      hasMore: boolean
      nextCursor?: string
      prevCursor?: string
    }
  }> {
    const { page, limit = 20, cursor, params = {} } = options
    
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      ...params
    })
    
    if (page !== undefined) {
      queryParams.set('page', page.toString())
    }
    
    if (cursor) {
      queryParams.set('cursor', cursor)
    }

    const response = await client.get<{
      data: T[]
      total?: number
      page?: number
      limit: number
      hasMore: boolean
      nextCursor?: string
      prevCursor?: string
    }>(`${url}?${queryParams.toString()}`)

    return {
      data: response.data.data,
      pagination: {
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
        hasMore: response.data.hasMore,
        nextCursor: response.data.nextCursor,
        prevCursor: response.data.prevCursor
      }
    }
  },

  /**
   * Create search request with debouncing and caching
   */
  createDebouncedSearch<T>(
    client: EnhancedApiClient,
    url: string,
    options: {
      delay?: number
      minLength?: number
      cacheResults?: boolean
    } = {}
  ) {
    const { delay = 300, minLength = 2, cacheResults = true } = options
    let timeoutId: NodeJS.Timeout | null = null
    const cache = new Map<string, ApiResponse<T[]>>()

    return (query: string, requestOptions: RequestOptions = {}): Promise<ApiResponse<T[]>> => {
      return new Promise((resolve, reject) => {
        if (query.length < minLength) {
          resolve({
            data: [],
            status: 200,
            headers: new Headers(),
            correlationId: generateCorrelationId()
          })
          return
        }

        // Check cache first
        if (cacheResults && cache.has(query)) {
          resolve(cache.get(query)!)
          return
        }

        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(async () => {
          try {
            const response = await client.get<T[]>(
              `${url}?q=${encodeURIComponent(query)}`, 
              requestOptions
            )
            
            if (cacheResults) {
              cache.set(query, response)
            }
            
            resolve(response)
          } catch (error) {
            reject(error)
          }
        }, delay)
      })
    }
  },

  /**
   * Create infinite scroll loader
   */
  createInfiniteLoader<T>(
    client: EnhancedApiClient,
    url: string,
    options: {
      limit?: number
      initialCursor?: string
    } = {}
  ) {
    const { limit = 20, initialCursor } = options
    let currentCursor = initialCursor
    let hasMore = true
    let loading = false

    return {
      async loadMore(): Promise<{
        data: T[]
        hasMore: boolean
        error?: ApiError
      }> {
        if (loading || !hasMore) {
          return { data: [], hasMore }
        }

        loading = true
        
        try {
          const result = await ApiUtils.paginate<T>(client, url, {
            limit,
            cursor: currentCursor
          })
          
          currentCursor = result.pagination.nextCursor
          hasMore = result.pagination.hasMore
          loading = false
          
          return {
            data: result.data,
            hasMore
          }
        } catch (error) {
          loading = false
          return {
            data: [],
            hasMore,
            error: error as ApiError
          }
        }
      },

      reset() {
        currentCursor = initialCursor
        hasMore = true
        loading = false
      },

      get isLoading() {
        return loading
      },

      get canLoadMore() {
        return hasMore && !loading
      }
    }
  },

  /**
   * Create resource manager with CRUD operations
   */
  createResourceManager<T extends { id: string }>(
    client: EnhancedApiClient,
    baseUrl: string
  ) {
    return {
      async list(params?: Record<string, any>): Promise<ApiResponse<T[]>> {
        const queryParams = params ? `?${new URLSearchParams(params).toString()}` : ''
        return client.get<T[]>(`${baseUrl}${queryParams}`)
      },

      async get(id: string): Promise<ApiResponse<T>> {
        return client.get<T>(`${baseUrl}/${id}`)
      },

      async create(data: Omit<T, 'id'>): Promise<ApiResponse<T>> {
        return client.post<T>(baseUrl, data)
      },

      async update(id: string, data: Partial<T>): Promise<ApiResponse<T>> {
        return client.patch<T>(`${baseUrl}/${id}`, data)
      },

      async delete(id: string): Promise<ApiResponse<void>> {
        return client.delete<void>(`${baseUrl}/${id}`)
      },

      async bulkCreate(items: Omit<T, 'id'>[]): Promise<ApiResponse<T[]>> {
        return client.post<T[]>(`${baseUrl}/bulk`, { items })
      },

      async bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>): Promise<ApiResponse<T[]>> {
        return client.patch<T[]>(`${baseUrl}/bulk`, { updates })
      },

      async bulkDelete(ids: string[]): Promise<ApiResponse<void>> {
        return client.request<void>(`${baseUrl}/bulk`, { 
          method: 'DELETE',
          body: JSON.stringify({ ids })
        })
      }
    }
  },

  /**
   * Create WebSocket-like real-time updates using polling
   */
  createRealTimeUpdates<T>(
    client: EnhancedApiClient,
    url: string,
    options: {
      interval?: number
      onUpdate?: (data: T) => void
      onError?: (error: ApiError) => void
    } = {}
  ) {
    const { interval = 5000, onUpdate, onError } = options
    let intervalId: NodeJS.Timeout | null = null
    let lastData: T | null = null

    return {
      start() {
        if (intervalId) return

        intervalId = setInterval(async () => {
          try {
            const response = await client.get<T>(url)
            
            // Only trigger update if data changed
            if (JSON.stringify(response.data) !== JSON.stringify(lastData)) {
              lastData = response.data
              if (onUpdate) {
                onUpdate(response.data)
              }
            }
          } catch (error) {
            if (onError) {
              onError(error as ApiError)
            }
          }
        }, interval)
      },

      stop() {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      },

      get isActive() {
        return intervalId !== null
      }
    }
  }
}