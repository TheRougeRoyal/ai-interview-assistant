/**
 * Audit logs API endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { auditLogger } from '@/lib/audit/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || undefined
  const action = searchParams.get('action') || undefined
  const resource = searchParams.get('resource') || undefined
  const status = searchParams.get('status') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

  try {
    const logs = await auditLogger.getLogs({
      userId,
      action,
      resource,
      status,
      limit,
      offset,
    })

    return NextResponse.json({
      logs,
      count: logs.length,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
