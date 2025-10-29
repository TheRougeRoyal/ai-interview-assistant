/**
 * Request/Response interceptors for the robust API client
 */

import { 
  type RequestInterceptor, 
  type ResponseInterceptor, 
  type ErrorInterceptor,
  InterceptorUtils
} from '@/store/enhanced/apiClient'
import { getApiLogger } from '@/lib/logging'
import { generateCorrelationId } from '@/lib/errors/correlation'
import type { ApiError } from '@/lib/errors'

/**
 * Authentication interceptors
 */
export const AuthInterceptors = {
  /**
   * JWT token interceptor
   */
  jwtToken: InterceptorUtils.createAuthInterceptor(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }),

  /**
   * Session-based auth interceptor
   */
  sessionAuth: (async (config) => {
    // Add session-based authentication headers
    config.headers = {
      ...config.headers,
      'X-Requested-With': 'XMLHttpRequest'
    }
    
    // Ensure credentials are included for cookie-based auth
    config.credentials = 'include'
    
    return config
  }) as RequestInterceptor,

  /**
   * API key interceptor
   */
  apiKey: (apiKey: string): RequestInterceptor => {
    return async (config) => {
      config.headers = {
        ...config.headers,
        'X-API-Key': apiKey
      }
      return config
    }
  },

  /**
   * Token refresh response interceptor
   */
  tokenRefresh: (async (response) => {
    // Check for token refresh in response headers
    const newToken = response.headers.get('X-New-Token')
    if (newToken && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', newToken)
    }
    
    // Handle 401 responses
    if (response.status === 401) {
      // Attempt token refresh
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include'
        })
        
        if (refreshResponse.ok) {
          const { token } = await refreshResponse.json()
          localStorage.setItem('auth_token', token)
        } else {
          // Refresh failed, clear token and redirect
          localStorage.removeItem('auth_token')
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        localStorage.removeItem('auth_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    
    return response
  }) as ResponseInterceptor
}

/**
 * Logging interceptors
 */
export const LoggingInterceptors = {
  /**
   * Request logging interceptor
   */
  request: (async (config) => {
    const logger = getApiLogger()
    
    logger.debug('API Request', {
      method: config.method || 'GET',
      url: config.url,
      correlationId: config.correlationId,
      timestamp: new Date().toISOString()
    })
    
    // Add request timestamp for performance tracking
    config.headers = {
      ...config.headers,
      'X-Request-Start': Date.now().toString()
    }
    
    return config
  }) as RequestInterceptor,

  /**
   * Response logging interceptor
   */
  response: (async (response) => {
    const logger = getApiLogger()
    const requestStart = response.headers.get('X-Request-Start')
    const duration = requestStart ? Date.now() - parseInt(requestStart) : undefined
    
    logger.info('API Response', {
      status: response.status,
      correlationId: response.correlationId,
      duration,
      timestamp: new Date().toISOString()
    })
    
    // Log slow requests
    if (duration && duration > 5000) {
      logger.warn('Slow API request detected', {
        correlationId: response.correlationId,
        duration
      })
    }
    
    return response
  }) as ResponseInterceptor,

  /**
   * Error logging interceptor
   */
  error: (async (error) => {
    const logger = getApiLogger()
    
    logger.error('API Error', error, {
      correlationId: error.correlationId,
      timestamp: new Date().toISOString()
    })
    
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      try {
        // Example: Send to Sentry, LogRocket, etc.
        if (window.Sentry) {
          window.Sentry.captureException(new Error(error.message), {
            tags: {
              correlationId: error.correlationId,
              errorCode: error.code
            },
            extra: error.details
          })
        }
      } catch (trackingError) {
        console.error('Error tracking failed:', trackingError)
      }
    }
    
    return error
  }) as ErrorInterceptor
}

/**
 * Performance interceptors
 */
export const PerformanceInterceptors = {
  /**
   * Request timing interceptor
   */
  timing: (async (config) => {
    // Add performance mark
    if (typeof window !== 'undefined' && window.performance) {
      const markName = `api-request-start-${config.correlationId}`
      window.performance.mark(markName)
    }
    
    config.headers = {
      ...config.headers,
      'X-Performance-Mark': `api-request-start-${config.correlationId}`
    }
    
    return config
  }) as RequestInterceptor,

  /**
   * Response timing interceptor
   */
  responseTime: (async (response) => {
    const performanceMark = response.headers.get('X-Performance-Mark')
    
    if (typeof window !== 'undefined' && window.performance && performanceMark) {
      const endMarkName = `api-request-end-${response.correlationId}`
      window.performance.mark(endMarkName)
      
      try {
        window.performance.measure(
          `api-request-${response.correlationId}`,
          performanceMark,
          endMarkName
        )
        
        const measure = window.performance.getEntriesByName(`api-request-${response.correlationId}`)[0]
        if (measure) {
          console.debug('API Performance:', {
            correlationId: response.correlationId,
            duration: measure.duration,
            url: response.headers.get('X-Request-URL')
          })
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error)
      }
    }
    
    return response
  }) as ResponseInterceptor
}

/**
 * Caching interceptors
 */
export const CachingInterceptors = {
  /**
   * Cache control request interceptor
   */
  cacheControl: (async (config) => {
    // Add cache control headers for GET requests
    if (config.method === 'GET' || !config.method) {
      config.headers = {
        ...config.headers,
        'Cache-Control': 'max-age=300', // 5 minutes
        'If-None-Match': '*' // Enable ETag support
      }
    }
    
    return config
  }) as RequestInterceptor,

  /**
   * ETag response interceptor
   */
  etag: (async (response) => {
    // Store ETag for future requests
    const etag = response.headers.get('ETag')
    if (etag && typeof window !== 'undefined') {
      const cacheKey = `etag-${response.correlationId}`
      sessionStorage.setItem(cacheKey, etag)
    }
    
    return response
  }) as ResponseInterceptor
}

/**
 * Security interceptors
 */
export const SecurityInterceptors = {
  /**
   * CSRF protection interceptor
   */
  csrf: (async (config) => {
    // Add CSRF token for state-changing requests
    if (config.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method.toUpperCase())) {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': csrfToken
        }
      }
    }
    
    return config
  }) as RequestInterceptor,

  /**
   * Content security interceptor
   */
  contentSecurity: (async (config) => {
    // Add security headers
    config.headers = {
      ...config.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
    
    return config
  }) as RequestInterceptor,

  /**
   * Response security validation
   */
  responseValidation: (async (response) => {
    // Validate response headers for security
    const contentType = response.headers.get('Content-Type')
    if (contentType && !contentType.includes('application/json') && !contentType.includes('text/')) {
      console.warn('Unexpected content type:', contentType)
    }
    
    // Check for security headers
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection'
    ]
    
    securityHeaders.forEach(header => {
      if (!response.headers.get(header)) {
        console.warn(`Missing security header: ${header}`)
      }
    })
    
    return response
  }) as ResponseInterceptor
}

/**
 * Rate limiting interceptors
 */
export const RateLimitInterceptors = {
  /**
   * Rate limit monitoring
   */
  monitor: InterceptorUtils.createRateLimitInterceptor(),

  /**
   * Rate limit retry interceptor
   */
  retry: (async (error) => {
    if (error.details?.status === 429) {
      const retryAfter = error.details?.retryAfter || 60
      
      console.warn(`Rate limited. Retrying after ${retryAfter} seconds`)
      
      // Add retry metadata
      error.details.retryable = true
      error.details.retryAfter = retryAfter * 1000 // Convert to milliseconds
    }
    
    return error
  }) as ErrorInterceptor
}

/**
 * Development interceptors (only active in development)
 */
export const DevelopmentInterceptors = process.env.NODE_ENV === 'development' ? {
  /**
   * Request debugging interceptor
   */
  debug: (async (config) => {
    console.group(`🚀 API Request: ${config.method?.toUpperCase() || 'GET'} ${config.url}`)
    console.log('Headers:', config.headers)
    console.log('Body:', config.body)
    console.log('Correlation ID:', config.correlationId)
    console.groupEnd()
    
    return config
  }) as RequestInterceptor,

  /**
   * Response debugging interceptor
   */
  debugResponse: (async (response) => {
    console.group(`✅ API Response: ${response.status}`)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))
    console.log('Correlation ID:', response.correlationId)
    console.groupEnd()
    
    return response
  }) as ResponseInterceptor,

  /**
   * Mock response interceptor for testing
   */
  mock: (mockResponses: Record<string, any>): ResponseInterceptor => {
    return async (response) => {
      const mockKey = `${response.status}`
      if (mockResponses[mockKey]) {
        console.warn(`🎭 Mocking response for status ${response.status}`)
        return {
          ...response,
          data: mockResponses[mockKey]
        }
      }
      return response
    }
  }
} : {}

/**
 * Interceptor presets for common use cases
 */
export const InterceptorPresets = {
  /**
   * Basic preset with essential interceptors
   */
  basic: {
    request: [
      AuthInterceptors.sessionAuth,
      LoggingInterceptors.request
    ],
    response: [
      AuthInterceptors.tokenRefresh,
      LoggingInterceptors.response
    ],
    error: [
      LoggingInterceptors.error
    ]
  },

  /**
   * Full preset with all production interceptors
   */
  production: {
    request: [
      AuthInterceptors.sessionAuth,
      SecurityInterceptors.csrf,
      SecurityInterceptors.contentSecurity,
      CachingInterceptors.cacheControl,
      PerformanceInterceptors.timing,
      LoggingInterceptors.request
    ],
    response: [
      AuthInterceptors.tokenRefresh,
      SecurityInterceptors.responseValidation,
      CachingInterceptors.etag,
      PerformanceInterceptors.responseTime,
      RateLimitInterceptors.monitor,
      LoggingInterceptors.response
    ],
    error: [
      RateLimitInterceptors.retry,
      LoggingInterceptors.error
    ]
  },

  /**
   * Development preset with debugging
   */
  development: {
    request: [
      AuthInterceptors.sessionAuth,
      ...(DevelopmentInterceptors ? [DevelopmentInterceptors.debug] : []),
      LoggingInterceptors.request
    ],
    response: [
      AuthInterceptors.tokenRefresh,
      ...(DevelopmentInterceptors ? [DevelopmentInterceptors.debugResponse] : []),
      LoggingInterceptors.response
    ],
    error: [
      LoggingInterceptors.error
    ]
  }
}

/**
 * Utility to apply interceptor preset to a client
 */
export function applyInterceptorPreset(
  client: any, 
  preset: keyof typeof InterceptorPresets
) {
  const interceptors = InterceptorPresets[preset]
  
  // Apply request interceptors
  interceptors.request.forEach(interceptor => {
    client.addRequestInterceptor(interceptor)
  })
  
  // Apply response interceptors
  interceptors.response.forEach(interceptor => {
    client.addResponseInterceptor(interceptor)
  })
  
  // Apply error interceptors
  interceptors.error.forEach(interceptor => {
    client.addErrorInterceptor(interceptor)
  })
}