/**
 * Metrics API endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '@/lib/metrics/collector'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'
  const metric = searchParams.get('metric')

  try {
    if (metric) {
      // Return specific metric
      const snapshot = metricsCollector.getSnapshot(metric)
      if (!snapshot) {
        return NextResponse.json({ error: 'Metric not found' }, { status: 404 })
      }
      return NextResponse.json(snapshot)
    } else {
      // Return all metrics
      const snapshots = metricsCollector.getAllSnapshots()
      
      if (format === 'prometheus') {
        // Prometheus text format
        const prometheus = formatPrometheus(snapshots)
        return new NextResponse(prometheus, {
          headers: {
            'Content-Type': 'text/plain; version=0.0.4',
          },
        })
      } else {
        // JSON format
        return NextResponse.json({
          timestamp: Date.now(),
          metrics: snapshots,
        })
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function formatPrometheus(snapshots: any[]): string {
  const lines: string[] = []

  for (const snapshot of snapshots) {
    const { name, type, value, count, sum, labels } = snapshot

    const labelStr = labels
      ? Object.entries(labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')
      : ''

    const metricLine = labelStr ? `${name}{${labelStr}}` : name

    // Add type hint
    lines.push(`# TYPE ${name} ${type}`)

    // Add metric value
    if (type === 'counter' || type === 'gauge') {
      lines.push(`${metricLine} ${value}`)
    } else if (type === 'histogram' || type === 'summary') {
      if (count !== undefined) lines.push(`${metricLine}_count ${count}`)
      if (sum !== undefined) lines.push(`${metricLine}_sum ${sum}`)
      if (snapshot.p50 !== undefined) lines.push(`${metricLine}{quantile="0.5"} ${snapshot.p50}`)
      if (snapshot.p95 !== undefined) lines.push(`${metricLine}{quantile="0.95"} ${snapshot.p95}`)
      if (snapshot.p99 !== undefined) lines.push(`${metricLine}{quantile="0.99"} ${snapshot.p99}`)
    }

    lines.push('') // Empty line between metrics
  }

  return lines.join('\n')
}
