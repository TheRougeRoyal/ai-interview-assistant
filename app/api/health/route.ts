/**
 * System health check API endpoint
 */

import { NextRequest } from 'next/server'
import { success } from '@/lib/errors'
import { SystemHealth } from '@/lib/health/system'
import { withMiddleware, MiddlewarePresets } from '@/lib/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health - Get overall system health status
 */
export const GET = withMiddleware(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed) {
      // Return detailed health information
      const health = await SystemHealth.getHealth()
      
      // Return appropriate status code based on health
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503

      return success(health, statusCode)
    } else {
      // Return simple status for load balancers
      const status = await SystemHealth.getStatus()
      const isHealthy = await SystemHealth.isHealthy()
      
      return success(status, isHealthy ? 200 : 503)
    }
  },
  {
    ...MiddlewarePresets.public(),
    rateLimit: {
      key: 'health:system',
      enabled: true
    },
    logging: {
      enabled: false, // Disable logging for health checks to reduce noise
      logRequest: false,
      logResponse: false,
      logPerformance: false
    }
  }
)