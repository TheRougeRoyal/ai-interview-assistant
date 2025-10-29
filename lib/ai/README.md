# AI Service Resilience

This directory contains robust error handling and resilience mechanisms for AI service integration.

## Overview

The AI gateway has been enhanced with multiple layers of resilience to handle service failures gracefully:

1. **Circuit Breaker Pattern** - Prevents cascading failures
2. **Retry with Exponential Backoff** - Handles transient failures
3. **Fallback Strategies** - Provides graceful degradation
4. **Request/Response Validation** - Ensures data integrity
5. **Result Caching** - Improves performance and availability

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│     Enhanced AI Gateway             │
│  - Validation                       │
│  - Circuit Breaker                  │
│  - Retry Logic                      │
│  - Fallback Handler                 │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────┐      ┌─────────────┐
│  OpenAI Vendor  │  or  │ Mock Vendor │
└─────────────────┘      └─────────────┘
```

## Components

### 1. Circuit Breaker (`circuit-breaker.ts`)

Implements the circuit breaker pattern to prevent cascading failures when AI services are down.

**States:**
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Service is failing, requests are rejected immediately
- **HALF_OPEN**: Testing if service has recovered

**Configuration:**
```typescript
{
  failureThreshold: 5,      // Open after 5 consecutive failures
  successThreshold: 2,      // Close after 2 successes in half-open
  timeout: 60000,           // Wait 60s before attempting half-open
  monitoringPeriod: 120000  // Track failures over 2 minute window
}
```

**Usage:**
```typescript
import { circuitBreakerRegistry } from '@/lib/ai/circuit-breaker'

const breaker = circuitBreakerRegistry.get('ai-openai')
const result = await breaker.execute(async () => {
  // Your AI call here
  return await callAiService()
})
```

### 2. Retry Mechanism (`retry.ts`)

Implements retry logic with exponential backoff and jitter for transient failures.

**Features:**
- Exponential backoff with configurable multiplier
- Optional jitter to prevent thundering herd
- Automatic retry for specific error types
- Maximum delay cap
- Detailed retry statistics

**Configuration:**
```typescript
{
  maxAttempts: 3,
  baseDelay: 1000,           // 1 second
  maxDelay: 30000,           // 30 seconds max
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [
    'TIMEOUT',
    'SERVICE_UNAVAILABLE',
    'NETWORK_ERROR',
    // ... more error codes
  ]
}
```

**Usage:**
```typescript
import { retryWithBackoff } from '@/lib/ai/retry'

const result = await retryWithBackoff(
  async () => {
    return await aiService.call()
  },
  {
    maxAttempts: 3,
    baseDelay: 1000
  },
  'generate-question'
)
```

### 3. Fallback Strategies (`fallback.ts`)

Provides graceful degradation when AI services are unavailable.

**Strategies:**
- **mock**: Use mock vendor as fallback
- **cached**: Return cached results only
- **degraded**: Return simplified/neutral responses
- **none**: Throw error (no fallback)

**Configuration:**
```typescript
{
  strategy: 'mock',
  enableCaching: true,
  cacheTimeout: 300000  // 5 minutes
}
```

**Usage:**
```typescript
import { fallbackHandler } from '@/lib/ai/fallback'

try {
  result = await aiService.call()
} catch (error) {
  result = await fallbackHandler.handleQuestionFallback(
    payload,
    error
  )
}
```

### 4. Enhanced Gateway (`enhanced-gateway.ts`)

Main entry point that combines all resilience mechanisms.

**Features:**
- Automatic request validation
- Circuit breaker integration
- Retry with exponential backoff
- Fallback on failure
- Response validation
- Result caching
- Comprehensive logging

**Usage:**
```typescript
import { ask, configureAiGateway } from '@/lib/ai/enhanced-gateway'

// Configure (optional)
configureAiGateway({
  enableCircuitBreaker: true,
  enableRetry: true,
  enableFallback: true,
  enableCaching: true
})

// Use gateway
const question = await ask('generate_question', {
  difficulty: 'medium',
  role: 'Software Engineer',
  resumeContext: 'Experienced with React and Node.js'
})
```

## Error Handling

### Error Types

All errors are normalized to a standard format:

```typescript
{
  code: string         // Error code (e.g., 'TIMEOUT', 'OPENAI_ERROR')
  message: string      // Human-readable message
  correlationId: string // For request tracing
  retryable: boolean   // Whether error is retryable
}
```

### Retryable Errors

The following errors trigger automatic retry:
- `TIMEOUT`
- `SERVICE_UNAVAILABLE`
- `CONNECTION_TIMEOUT`
- `NETWORK_ERROR`
- `EXTERNAL_SERVICE_ERROR`
- HTTP 5xx status codes
- HTTP 429 (rate limit)

### Non-Retryable Errors

These errors fail immediately without retry:
- `VALIDATION_FAILED`
- `SCHEMA_VALIDATION_FAILED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- HTTP 4xx status codes (except 429)

## Monitoring

### Health Check Endpoint

```bash
GET /api/health/ai
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "vendor": "openai",
  "services": {
    "ai": {
      "available": true,
      "vendor": "openai",
      "config": { ... }
    }
  },
  "resilience": {
    "circuitBreakers": {
      "ai-openai": {
        "state": "CLOSED",
        "failures": 0,
        "successes": 150,
        "totalRequests": 150
      }
    },
    "retryStats": {
      "totalAttempts": 165,
      "successfulFirstAttempts": 150,
      "successfulRetries": 10,
      "failedRetries": 5
    },
    "cache": {
      "size": 25,
      "maxSize": 100
    }
  }
}
```

### Circuit Breaker Statistics

```typescript
import { circuitBreakerRegistry } from '@/lib/ai/circuit-breaker'

const stats = circuitBreakerRegistry.getAllStats()
console.log(stats)
```

### Retry Statistics

```typescript
import { retryStats } from '@/lib/ai/retry'

const stats = retryStats.getStats()
console.log(stats)
```

## Configuration

### Environment Variables

```env
# AI Vendor Selection
AI_VENDOR=deepseek  # 'openai', 'deepseek', or 'mock'

# OpenAI Configuration (when AI_VENDOR=openai)
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# DeepSeek Configuration (when AI_VENDOR=deepseek)
DEEPSEEK_API_KEY=sk-...
AI_MODEL=deepseek-chat

# Mock Mode (for testing)
MOCK_MODE=false
```

### Runtime Configuration

```typescript
import { configureAiGateway } from '@/lib/ai/enhanced-gateway'

// Disable circuit breaker for testing
configureAiGateway({
  enableCircuitBreaker: false,
  enableRetry: false
})

// Enable aggressive caching
configureAiGateway({
  enableCaching: true,
  fallbackConfig: {
    strategy: 'cached',
    cacheTimeout: 600000  // 10 minutes
  }
})
```

## Testing

### Unit Tests

```bash
npm test lib/ai/__tests__/circuit-breaker.test.ts
npm test lib/ai/__tests__/retry.test.ts
npm test lib/ai/__tests__/fallback.test.ts
```

### Integration Tests

```bash
npm test lib/ai/__tests__/enhanced-gateway.test.ts
```

### Mock Mode

For testing without real AI calls:

```env
AI_VENDOR=mock
```

Or programmatically:

```typescript
process.env.AI_VENDOR = 'mock'
```

## Best Practices

1. **Always use the enhanced gateway** (`enhanced-gateway.ts`) instead of calling vendors directly
2. **Enable all resilience features** in production
3. **Monitor circuit breaker states** - open circuits indicate service issues
4. **Set appropriate timeouts** based on your SLA requirements
5. **Cache aggressively** for read-heavy operations
6. **Log all failures** with correlation IDs for debugging
7. **Test fallback strategies** to ensure acceptable degraded behavior
8. **Configure retry limits** to prevent excessive load on failing services

## Migration from Old Gateway

Replace:
```typescript
import { ask } from '@/lib/ai/gateway'
```

With:
```typescript
import { ask } from '@/lib/ai/enhanced-gateway'
```

The API is identical, but enhanced with resilience features.

## Troubleshooting

### Circuit Breaker is OPEN

- Check AI service health
- Review recent error logs
- Manually reset if needed: `circuitBreakerRegistry.reset('ai-openai')`

### High Retry Rate

- Indicates service instability
- Consider increasing timeouts
- Check network connectivity
- Review error patterns in logs

### Cache Misses

- Verify caching is enabled
- Check cache size limits
- Review cache timeout settings
- Monitor cache statistics

## Future Improvements

- [ ] Add rate limiting per user
- [ ] Implement request queuing
- [ ] Add distributed circuit breaker (Redis)
- [ ] Enhanced metrics collection
- [ ] Real-time alerting
- [ ] Admin dashboard for circuit breaker management
