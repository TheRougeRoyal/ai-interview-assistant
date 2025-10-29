/**
 * AI Service Health Check Endpoint
 * Returns status of AI services, circuit breakers, and resilience mechanisms
 */

import { NextResponse } from 'next/server'
import { getAiServiceHealth, getCurrentVendor } from '@/lib/ai/enhanced-gateway'
import { circuitBreakerRegistry } from '@/lib/ai/circuit-breaker'

export async function GET() {
  try {
    const health = getAiServiceHealth()
    const allCircuitBreakers = circuitBreakerRegistry.getAllStats()
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      vendor: getCurrentVendor(),
      services: {
        ai: {
          available: health.available,
          vendor: health.vendor,
          config: health.config
        }
      },
      resilience: {
        circuitBreakers: allCircuitBreakers,
        retryStats: health.retryStats,
        cache: health.cacheStats
      }
    }

    // Determine overall health status
    const hasOpenCircuits = Object.values(allCircuitBreakers).some(
      cb => cb.state === 'OPEN'
    )
    
    if (hasOpenCircuits) {
      status.status = 'degraded'
    }

    const statusCode = status.status === 'healthy' ? 200 : 503

    return NextResponse.json(status, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
