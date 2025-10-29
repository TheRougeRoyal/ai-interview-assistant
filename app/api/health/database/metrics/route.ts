/**
 * Database metrics API endpoint
 */

import { NextRequest } from 'next/server'
import { success, handleApiError } from '@/lib/errors'
import { DatabaseMonitoring } from '@/lib/db/monitoring'
import { withMiddleware, MiddlewarePresets } from '@/lib/middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/database/metrics - Get database metrics
 */
export const GET = withMiddleware(
  async (req: NextRequest, context) => {
    const { searchParams } = new URL(req.url)
    const timeWindow = searchParams.get('timeWindow') 
      ? parseInt(searchParams.get('timeWindow')!) 
      : undefined

    const [metrics, queryStats, slowQueries] = await Promise.all([
      DatabaseMonitoring.getMetrics(),
      DatabaseMonitoring.getQueryStats(timeWindow),
      DatabaseMonitoring.getSlowQueries(10)
    ])

    return success({
      metrics,
      queryStats,
      slowQueries,
      timestamp: new Date().toISOString()
    })
  },
  {
    ...MiddlewarePresets.protected(), // Require authentication for detailed metrics
    rateLimit: {
      key: 'health:database:metrics',
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