# Robust API Client

A comprehensive, production-ready API client with automatic retry logic, request/response interceptors, optimistic updates, circuit breaker pattern, and extensive error handling capabilities.

## Features

- **🔄 Automatic Retry Logic**: Exponential backoff with configurable retry policies
- **🔌 Request/Response Interceptors**: Modular middleware system for cross-cutting concerns
- **⚡ Optimistic Updates**: Immediate UI feedback with automatic rollback on failures
- **🛡️ Circuit Breaker**: Prevents cascade failures with automatic recovery
- **📊 Performance Monitoring**: Built-in metrics and performance tracking
- **💾 Intelligent Caching**: Response caching with TTL and invalidation
- **🔐 Security Features**: CSRF protection, content validation, and secure headers
- **📱 File Upload Support**: Progress tracking and large file handling
- **🔍 Advanced Search**: Debounced search with result caching
- **♾️ Infinite Scroll**: Cursor-based pagination support
- **📡 Real-time Updates**: Polling-based real-time data synchronization
- **🎯 Batch Operations**: Concurrent request processing with progress tracking

## Quick Start

### Basic Usage

```typescript
import { robustApiClient } from '@/lib/api/robustClient'

// Simple GET request
const response = await robustApiClient.get('/api/candidates')
console.log(response.data)

// POST with data
const newCandidate = await robustApiClient.post('/api/candidates', {
  name: 'John Doe',
  email: 'john@example.com'
})

// PATCH with optimistic update
const updated = await robustApiClient.patch('/api/candidates/123', {
  finalScore: 85
})
```

### Resource Managers

```typescript
import { candidatesApi, sessionsApi } from '@/lib/api/robustClient'

// CRUD operations made simple
const candidates = await candidatesApi.list({ page: 1, limit: 10 })
const candidate = await candidatesApi.get('candidate-id')
const created = await candidatesApi.create({ name: 'Jane Doe', email: 'jane@example.com' })
const updated = await candidatesApi.update('candidate-id', { finalScore: 92 })
await candidatesApi.delete('candidate-id')

// Bulk operations
const bulkCreated = await candidatesApi.bulkCreate([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' }
])
```

## Advanced Features

### Optimistic Updates

Provide immediate feedback to users while the actual request happens in the background:

```typescript
import { CandidateOptimisticUpdates } from '@/lib/api/optimisticUpdates'

// Update score optimistically
await CandidateOptimisticUpdates.updateScore(
  candidateId,
  85, // New score shown immediately
  originalCandidate // Fallback data if request fails
)
```

### Request Interceptors

Add cross-cutting concerns like authentication, logging, and security:

```typescript
import { robustApiClient, applyInterceptorPreset } from '@/lib/api'

// Apply production interceptors
applyInterceptorPreset(robustApiClient, 'production')

// Add custom interceptor
robustApiClient.addRequestInterceptor(async (config) => {
  config.headers['X-Custom-Header'] = 'value'
  return config
})
```

### File Upload with Progress

```typescript
const result = await robustApiClient.uploadResume(
  file,
  candidateId,
  (progress) => {
    console.log(`Upload: ${progress}%`)
    // Update progress bar
  }
)
```

### Real-time Updates

```typescript
const monitor = robustApiClient.createSessionMonitor(
  sessionId,
  (sessionData) => {
    // Handle real-time updates
    updateUI(sessionData)
  }
)

monitor.start() // Begin polling
// monitor.stop() when done
```

### Search with Debouncing

```typescript
const search = robustApiClient.createCandidateSearch()

// Automatically debounced and cached
const results = await search('john doe')
```

### Infinite Scroll

```typescript
const loader = robustApiClient.createCandidateLoader()

// Load more data
const { data, hasMore, error } = await loader.loadMore()

if (loader.canLoadMore) {
  // Load next page
}
```

## Configuration

### Client Configuration

```typescript
import { EnhancedApiClient } from '@/store/enhanced/apiClient'

const client = new EnhancedApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  retryBackoff: 2,
  enableMetrics: true,
  enableCaching: true,
  cacheTimeout: 300000,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 60000
  }
})
```

### Interceptor Presets

Choose from pre-configured interceptor combinations:

```typescript
import { applyInterceptorPreset } from '@/lib/api/interceptors'

// Basic: Essential interceptors only
applyInterceptorPreset(client, 'basic')

// Production: Full security and monitoring
applyInterceptorPreset(client, 'production')

// Development: With debugging tools
applyInterceptorPreset(client, 'development')
```

## Error Handling

### Automatic Error Recovery

The client automatically handles common error scenarios:

- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Respects `Retry-After` headers
- **Authentication**: Automatic token refresh
- **Circuit Breaker**: Prevents cascade failures

### Custom Error Handling

```typescript
robustApiClient.addErrorInterceptor(async (error) => {
  if (error.code === 'NETWORK_ERROR') {
    // Show offline notification
    showOfflineMode()
  }
  
  // Log to external service
  errorTracker.captureException(error)
  
  return error
})
```

## Monitoring and Metrics

### Built-in Metrics

```typescript
const metrics = robustApiClient.getApiMetrics()
console.log({
  totalRequests: metrics.totalRequests,
  successRate: metrics.successfulRequests / metrics.totalRequests,
  averageResponseTime: metrics.averageResponseTime,
  cacheHitRate: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses),
  circuitBreakerState: metrics.circuitBreaker.state
})
```

### Health Monitoring

```typescript
// Check system health
const health = await robustApiClient.healthCheck()
console.log('System status:', health.data.status)
```

## Security Features

### CSRF Protection

Automatically adds CSRF tokens to state-changing requests:

```typescript
// CSRF token automatically added for POST/PUT/PATCH/DELETE
await robustApiClient.post('/api/candidates', data)
```

### Content Security

- Validates response content types
- Adds security headers
- Prevents XSS and injection attacks

### Authentication

- Automatic token management
- Token refresh on expiration
- Secure token storage

## Performance Optimization

### Caching Strategy

- **Response Caching**: Automatic caching of GET requests
- **ETag Support**: Conditional requests to reduce bandwidth
- **Cache Invalidation**: Smart cache invalidation on mutations

### Request Optimization

- **Request Deduplication**: Prevents duplicate concurrent requests
- **Batch Processing**: Efficient handling of multiple requests
- **Connection Pooling**: Reuses connections for better performance

## Testing

### Mock Responses

```typescript
import { DevelopmentInterceptors } from '@/lib/api/interceptors'

// Mock specific responses for testing
const mockInterceptor = DevelopmentInterceptors.mock({
  '200': { success: true, data: mockData },
  '404': { error: 'Not found' }
})

client.addResponseInterceptor(mockInterceptor)
```

### Test Utilities

```typescript
// Reset client state for testing
robustApiClient.resetMetrics()
robustApiClient.resetCircuitBreaker()
robustApiClient.clearCache()
```

## Integration Examples

### React Component

```typescript
import { useCandidates } from '@/store/enhanced/hooks'
import { CandidateOptimisticUpdates } from '@/lib/api/optimisticUpdates'

function CandidateList() {
  const { candidates, loading, error } = useCandidates()

  const handleUpdateScore = async (id: string, score: number) => {
    const candidate = candidates.find(c => c.id === id)
    if (!candidate) return

    try {
      await CandidateOptimisticUpdates.updateScore(id, score, candidate)
      // UI updates immediately, reverts on error
    } catch (error) {
      console.error('Update failed:', error)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {candidates.map(candidate => (
        <div key={candidate.id}>
          {candidate.name} - Score: {candidate.finalScore}
          <button onClick={() => handleUpdateScore(candidate.id, 85)}>
            Update Score
          </button>
        </div>
      ))}
    </div>
  )
}
```

### Redux Integration

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit'
import { candidatesApi } from '@/lib/api/robustClient'

export const fetchCandidates = createAsyncThunk(
  'candidates/fetchList',
  async (params: { page: number; limit: number }) => {
    const response = await candidatesApi.list(params)
    return response.data
  }
)
```

## Best Practices

### 1. Use Resource Managers

Prefer resource managers over direct API calls for CRUD operations:

```typescript
// ✅ Good
const candidate = await candidatesApi.get(id)

// ❌ Avoid
const candidate = await robustApiClient.get(`/api/candidates/${id}`)
```

### 2. Implement Optimistic Updates

For better UX, use optimistic updates for non-critical operations:

```typescript
// ✅ Good - immediate feedback
await OptimisticPatterns.update(url, id, updates, originalData)

// ❌ Slower UX
await robustApiClient.patch(url, updates)
```

### 3. Handle Errors Gracefully

Always provide fallback behavior for failed requests:

```typescript
try {
  const data = await candidatesApi.list()
  setData(data)
} catch (error) {
  // Show cached data or empty state
  setData(getCachedData() || [])
  showErrorNotification(error.message)
}
```

### 4. Monitor Performance

Regularly check API metrics and circuit breaker state:

```typescript
// Set up monitoring dashboard
setInterval(() => {
  const metrics = robustApiClient.getApiMetrics()
  updateDashboard(metrics)
}, 30000)
```

### 5. Use Appropriate Timeouts

Set reasonable timeouts based on operation type:

```typescript
// Quick operations
await robustApiClient.get('/api/health', { timeout: 5000 })

// File uploads
await robustApiClient.upload('/api/files', file, { timeout: 60000 })
```

## Troubleshooting

### Common Issues

1. **Circuit Breaker Open**: Check error logs and reset if needed
2. **High Response Times**: Review caching strategy and server performance
3. **Authentication Failures**: Verify token refresh logic
4. **Cache Issues**: Clear cache or adjust TTL settings

### Debug Mode

Enable debug logging in development:

```typescript
// Apply development preset for detailed logging
applyInterceptorPreset(robustApiClient, 'development')
```

### Health Checks

Regular health checks help identify issues early:

```typescript
// Monitor system health
setInterval(async () => {
  try {
    await robustApiClient.healthCheck()
  } catch (error) {
    console.error('Health check failed:', error)
    // Alert monitoring system
  }
}, 60000)
```

## Migration Guide

### From Legacy API Client

1. Replace direct `fetchAPI` calls with `robustApiClient`
2. Use resource managers for CRUD operations
3. Implement optimistic updates for better UX
4. Add appropriate interceptors for your use case

### Example Migration

```typescript
// Before
const response = await fetchAPI('/api/candidates', {
  method: 'POST',
  body: JSON.stringify(data)
})

// After
const response = await candidatesApi.create(data)
```

## Contributing

When adding new features:

1. Add appropriate TypeScript types
2. Include comprehensive error handling
3. Add unit tests for new functionality
4. Update documentation and examples
5. Consider backward compatibility

## License

This robust API client is part of the AI Interview Assistant project and follows the same licensing terms.