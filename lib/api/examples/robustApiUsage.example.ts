/**
 * Examples demonstrating robust API client usage patterns
 */

import { 
  robustApiClient, 
  candidatesApi, 
  sessionsApi,
  RobustApiUtils 
} from '../robustClient'
import { 
  AuthInterceptors, 
  LoggingInterceptors, 
  applyInterceptorPreset 
} from '../interceptors'
import { 
  OptimisticPatterns, 
  CandidateOptimisticUpdates,
  useOptimisticUpdate 
} from '../optimisticUpdates'
import { ApiUtils } from '@/store/enhanced/apiClient'

/**
 * Example 1: Basic API operations with error handling
 */
export async function basicApiOperations() {
  try {
    // Simple GET request
    const candidates = await robustApiClient.get('/api/candidates')
    console.log('Candidates:', candidates.data)

    // POST request with data
    const newCandidate = await robustApiClient.post('/api/candidates', {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    })
    console.log('Created candidate:', newCandidate.data)

    // PATCH request with optimistic update
    const updatedCandidate = await robustApiClient.patch(
      `/api/candidates/${newCandidate.data.id}`,
      { finalScore: 85 }
    )
    console.log('Updated candidate:', updatedCandidate.data)

  } catch (error) {
    console.error('API operation failed:', error)
    // Error is already logged by interceptors
  }
}

/**
 * Example 2: Using resource managers for CRUD operations
 */
export async function resourceManagerExample() {
  try {
    // List all candidates
    const candidatesList = await candidatesApi.list({ page: 1, limit: 10 })
    console.log('Candidates list:', candidatesList.data)

    // Get specific candidate
    const candidate = await candidatesApi.get('candidate-id')
    console.log('Candidate details:', candidate.data)

    // Create new candidate
    const newCandidate = await candidatesApi.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+1987654321'
    })
    console.log('New candidate:', newCandidate.data)

    // Update candidate
    const updated = await candidatesApi.update(newCandidate.data.id, {
      finalScore: 92
    })
    console.log('Updated candidate:', updated.data)

    // Bulk operations
    const bulkCreated = await candidatesApi.bulkCreate([
      { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1111111111' },
      { name: 'Bob Wilson', email: 'bob@example.com', phone: '+2222222222' }
    ])
    console.log('Bulk created:', bulkCreated.data)

  } catch (error) {
    console.error('Resource manager operation failed:', error)
  }
}

/**
 * Example 3: Optimistic updates with rollback
 */
export async function optimisticUpdateExample() {
  const candidateId = 'candidate-123'
  const originalCandidate = {
    id: candidateId,
    name: 'John Doe',
    email: 'john@example.com',
    finalScore: 75
  }

  try {
    // Optimistic score update
    const result = await CandidateOptimisticUpdates.updateScore(
      candidateId,
      85,
      originalCandidate
    )
    
    console.log('Score updated optimistically:', result.data)
    // UI shows score as 85 immediately, even before server confirms

  } catch (error) {
    console.error('Optimistic update failed and was rolled back:', error)
    // UI automatically reverts to original score (75)
  }
}

/**
 * Example 4: File upload with progress tracking
 */
export async function fileUploadExample(file: File, candidateId: string) {
  try {
    const result = await robustApiClient.uploadResume(
      file,
      candidateId,
      (progress) => {
        console.log(`Upload progress: ${progress}%`)
        // Update progress bar in UI
      }
    )
    
    console.log('File uploaded successfully:', result.data)
    
  } catch (error) {
    console.error('File upload failed:', error)
  }
}

/**
 * Example 5: Batch operations with progress tracking
 */
export async function batchOperationsExample() {
  const candidateData = [
    { name: 'Alice', email: 'alice@example.com', phone: '+1111111111' },
    { name: 'Bob', email: 'bob@example.com', phone: '+2222222222' },
    { name: 'Charlie', email: 'charlie@example.com', phone: '+3333333333' }
  ]

  try {
    const results = await robustApiClient.batchCreateCandidates(candidateData)
    
    const successful = results.filter(result => 'data' in result)
    const failed = results.filter(result => 'code' in result)
    
    console.log(`Batch operation completed: ${successful.length} successful, ${failed.length} failed`)
    
    if (failed.length > 0) {
      console.error('Failed operations:', failed)
    }
    
  } catch (error) {
    console.error('Batch operation failed:', error)
  }
}

/**
 * Example 6: Real-time updates with polling
 */
export async function realTimeUpdatesExample(sessionId: string) {
  // Create session monitor
  const monitor = robustApiClient.createSessionMonitor(
    sessionId,
    (sessionData) => {
      console.log('Session updated:', sessionData)
      // Update UI with new session data
    }
  )

  // Start monitoring
  monitor.start()
  
  // Stop monitoring after 5 minutes
  setTimeout(() => {
    monitor.stop()
    console.log('Stopped session monitoring')
  }, 5 * 60 * 1000)
}

/**
 * Example 7: Search with debouncing
 */
export async function searchExample() {
  const candidateSearch = robustApiClient.createCandidateSearch()
  
  // Simulate user typing
  const searchQueries = ['jo', 'joh', 'john', 'john d', 'john doe']
  
  for (const query of searchQueries) {
    try {
      const results = await candidateSearch(query)
      console.log(`Search results for "${query}":`, results.data)
    } catch (error) {
      console.error(`Search failed for "${query}":`, error)
    }
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

/**
 * Example 8: Infinite scroll implementation
 */
export async function infiniteScrollExample() {
  const candidateLoader = robustApiClient.createCandidateLoader()
  
  // Load first page
  let result = await candidateLoader.loadMore()
  console.log('First page:', result.data)
  
  // Load more pages
  while (candidateLoader.canLoadMore) {
    result = await candidateLoader.loadMore()
    console.log('Next page:', result.data)
    
    if (result.error) {
      console.error('Loading failed:', result.error)
      break
    }
  }
  
  console.log('All pages loaded')
}

/**
 * Example 9: Polling for job completion
 */
export async function jobPollingExample(jobId: string) {
  try {
    const result = await RobustApiUtils.pollJobStatus(
      jobId,
      (status) => {
        console.log('Job status update:', status)
        // Update progress indicator in UI
      }
    )
    
    console.log('Job completed:', result.data)
    
  } catch (error) {
    console.error('Job polling failed:', error)
  }
}

/**
 * Example 10: Custom interceptors setup
 */
export function customInterceptorsExample() {
  // Apply production interceptor preset
  applyInterceptorPreset(robustApiClient, 'production')
  
  // Add custom request interceptor
  robustApiClient.addRequestInterceptor(async (config) => {
    // Add custom header
    config.headers = {
      ...config.headers,
      'X-Custom-Header': 'my-value'
    }
    
    // Log request in custom format
    console.log(`Making request to: ${config.url}`)
    
    return config
  })
  
  // Add custom response interceptor
  robustApiClient.addResponseInterceptor(async (response) => {
    // Custom response processing
    if (response.status === 200) {
      console.log('Request successful!')
    }
    
    return response
  })
  
  // Add custom error interceptor
  robustApiClient.addErrorInterceptor(async (error) => {
    // Custom error handling
    if (error.code === 'NETWORK_ERROR') {
      // Show offline notification
      console.log('Network error detected - showing offline mode')
    }
    
    return error
  })
}

/**
 * Example 11: Request cancellation
 */
export async function requestCancellationExample() {
  const { response, cancel } = await robustApiClient.requestWithCancellation(
    '/api/candidates',
    { method: 'GET' }
  )
  
  // Cancel request after 5 seconds
  setTimeout(() => {
    cancel()
    console.log('Request cancelled')
  }, 5000)
  
  try {
    const result = await response
    console.log('Request completed:', result.data)
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled')
    } else {
      console.error('Request failed:', error)
    }
  }
}

/**
 * Example 12: Circuit breaker monitoring
 */
export function circuitBreakerExample() {
  // Monitor circuit breaker state
  setInterval(() => {
    const metrics = robustApiClient.getApiMetrics()
    console.log('API Metrics:', {
      totalRequests: metrics.totalRequests,
      successRate: (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2) + '%',
      averageResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms',
      circuitBreakerState: metrics.circuitBreaker.state
    })
    
    // Alert if circuit breaker is open
    if (metrics.circuitBreaker.state === 'open') {
      console.warn('⚠️ Circuit breaker is OPEN - API requests are being blocked')
    }
  }, 10000) // Check every 10 seconds
}

/**
 * Example 13: Health check monitoring
 */
export async function healthCheckExample() {
  try {
    const health = await robustApiClient.healthCheck()
    console.log('System health:', health.data)
    
    if (health.data.status !== 'healthy') {
      console.warn('System is not healthy:', health.data.services)
    }
    
  } catch (error) {
    console.error('Health check failed:', error)
  }
}

/**
 * Example 14: React component using optimistic updates
 */
export function OptimisticCandidateComponent() {
  const { optimisticUpdate, isPending, getOptimisticData } = useOptimisticUpdate()
  
  const handleUpdateScore = async (candidateId: string, newScore: number) => {
    const originalCandidate = getCurrentCandidate(candidateId) // Your data fetching logic
    
    try {
      await optimisticUpdate(
        candidateId,
        originalCandidate,
        { finalScore: newScore },
        async (optimisticData) => {
          const response = await candidatesApi.update(candidateId, { finalScore: newScore })
          return response.data
        }
      )
      
      console.log('Score updated successfully')
    } catch (error) {
      console.error('Score update failed:', error)
      // UI automatically reverts to original state
    }
  }
  
  // Component would render with optimistic data
  // isPending(candidateId) can be used to show loading state
  // getOptimisticData(candidateId) gets the optimistic data
}

// Helper function for the example
function getCurrentCandidate(id: string) {
  // This would typically come from your state management
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
    finalScore: 75
  }
}