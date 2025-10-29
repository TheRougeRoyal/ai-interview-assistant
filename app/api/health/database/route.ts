/**
 * Database health check API endpoint
 */

import { NextRequest } from 'next/server'
import { success, handleApiError } from '@/lib/errors'
import { DatabaseMonitoring } from '@/lib/db/monitoring'
import { withMiddleware, MiddlewarePresets } from '@/lib/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/database - Get database health status
 */
export const GET = withMiddleware(
  async (req: NextRequest) => {
    const health = await DatabaseMonitoring.getHealth()
    
    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return success(health, statusCode)
  },
  {
    ...MiddlewarePresets.public(),
    rateLimit: {
      key: 'health:database',
      enabled: true
    },
    logging: {
      enabled: true,
      logRequest: false,
      logResponse: false,
      logPerformance: true
    }
  }
)