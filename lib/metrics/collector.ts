/**
 * Metrics collection and aggregation system
 */

import { getLogger } from '@/lib/logging'

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary'

export interface Metric {
  name: string
  type: MetricType
  value: number
  timestamp: number
  labels?: Record<string, string>
}

export interface MetricSnapshot {
  name: string
  type: MetricType
  value: number
  count?: number
  sum?: number
  min?: number
  max?: number
  avg?: number
  p50?: number
  p95?: number
  p99?: number
  labels?: Record<string, string>
  timestamp: number
}

/**
 * Metrics collector for tracking system performance
 */
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map()
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private logger = getLogger()

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)

    this.recordMetric({
      name,
      type: 'counter',
      value: current + value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels)
    this.gauges.set(key, value)

    this.recordMetric({
      name,
      type: 'gauge',
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Record a histogram value (for latencies, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric({
      name,
      type: 'histogram',
      value,
      timestamp: Date.now(),
      labels,
    })
  }

  /**
   * Record a timing metric (convenience method for histograms)
   */
  recordTiming(name: string, durationMs: number, labels?: Record<string, string>): void {
    this.recordHistogram(name, durationMs, labels)
  }

  /**
   * Get counter value
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels)
    return this.counters.get(key) || 0
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels)
    return this.gauges.get(key) || 0
  }

  /**
   * Get all metrics for a given name
   */
  getMetrics(name: string): Metric[] {
    return this.metrics.get(name) || []
  }

  /**
   * Get metric snapshot with aggregated statistics
   */
  getSnapshot(name: string, labels?: Record<string, string>): MetricSnapshot | null {
    const metrics = this.getMetrics(name)
    if (metrics.length === 0) return null

    // Filter by labels if provided
    const filtered = labels
      ? metrics.filter((m) => this.labelsMatch(m.labels, labels))
      : metrics

    if (filtered.length === 0) return null

    const type = filtered[0].type
    const values = filtered.map((m) => m.value)

    const snapshot: MetricSnapshot = {
      name,
      type,
      value: values[values.length - 1], // Latest value
      timestamp: Date.now(),
      labels,
    }

    if (type === 'histogram' || type === 'summary') {
      const sorted = values.sort((a, b) => a - b)
      snapshot.count = values.length
      snapshot.sum = values.reduce((a, b) => a + b, 0)
      snapshot.min = sorted[0]
      snapshot.max = sorted[sorted.length - 1]
      snapshot.avg = snapshot.sum / snapshot.count
      snapshot.p50 = this.percentile(sorted, 0.5)
      snapshot.p95 = this.percentile(sorted, 0.95)
      snapshot.p99 = this.percentile(sorted, 0.99)
    }

    return snapshot
  }

  /**
   * Get all metric snapshots
   */
  getAllSnapshots(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = []
    
    for (const name of this.metrics.keys()) {
      const snapshot = this.getSnapshot(name)
      if (snapshot) {
        snapshots.push(snapshot)
      }
    }

    return snapshots
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
    this.counters.clear()
    this.gauges.clear()
  }

  /**
   * Clear metrics older than the specified time
   */
  clearOlderThan(ageMs: number): void {
    const cutoff = Date.now() - ageMs
    
    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter((m) => m.timestamp >= cutoff)
      if (filtered.length > 0) {
        this.metrics.set(name, filtered)
      } else {
        this.metrics.delete(name)
      }
    }
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    const existing = this.metrics.get(metric.name) || []
    existing.push(metric)
    
    // Keep only last 1000 data points per metric to prevent memory issues
    if (existing.length > 1000) {
      existing.shift()
    }
    
    this.metrics.set(metric.name, existing)
  }

  /**
   * Get metric key including labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',')
    return `${name}{${labelStr}}`
  }

  /**
   * Check if labels match
   */
  private labelsMatch(
    a: Record<string, string> | undefined,
    b: Record<string, string> | undefined
  ): boolean {
    if (!a && !b) return true
    if (!a || !b) return false

    const keysA = Object.keys(a).sort()
    const keysB = Object.keys(b).sort()

    if (keysA.length !== keysB.length) return false
    if (!keysA.every((k, i) => k === keysB[i])) return false

    return keysA.every((k) => a[k] === b[k])
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1
    return sorted[Math.max(0, index)]
  }
}

/**
 * Global metrics collector instance
 */
export const metricsCollector = new MetricsCollector()

/**
 * Metrics utilities
 */
export const Metrics = {
  /**
   * Increment counter
   */
  inc(name: string, value?: number, labels?: Record<string, string>): void {
    metricsCollector.incrementCounter(name, value, labels)
  },

  /**
   * Set gauge
   */
  set(name: string, value: number, labels?: Record<string, string>): void {
    metricsCollector.setGauge(name, value, labels)
  },

  /**
   * Record timing
   */
  timing(name: string, durationMs: number, labels?: Record<string, string>): void {
    metricsCollector.recordTiming(name, durationMs, labels)
  },

  /**
   * Record histogram value
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    metricsCollector.recordHistogram(name, value, labels)
  },

  /**
   * Get snapshot
   */
  snapshot(name: string, labels?: Record<string, string>): MetricSnapshot | null {
    return metricsCollector.getSnapshot(name, labels)
  },

  /**
   * Get all snapshots
   */
  all(): MetricSnapshot[] {
    return metricsCollector.getAllSnapshots()
  },

  /**
   * Clear metrics
   */
  clear(): void {
    metricsCollector.clear()
  },
}

/**
 * Timer utility for measuring execution time
 */
export class Timer {
  private startTime: number

  constructor(private metricName: string, private labels?: Record<string, string>) {
    this.startTime = Date.now()
  }

  /**
   * Stop timer and record metric
   */
  stop(): number {
    const duration = Date.now() - this.startTime
    Metrics.timing(this.metricName, duration, this.labels)
    return duration
  }

  /**
   * Create and start a timer
   */
  static start(metricName: string, labels?: Record<string, string>): Timer {
    return new Timer(metricName, labels)
  }
}

// Standard metric names
export const MetricNames = {
  // API metrics
  API_REQUEST_COUNT: 'api_request_count',
  API_REQUEST_DURATION: 'api_request_duration',
  API_ERROR_COUNT: 'api_error_count',
  
  // Database metrics
  DB_QUERY_COUNT: 'db_query_count',
  DB_QUERY_DURATION: 'db_query_duration',
  DB_ERROR_COUNT: 'db_error_count',
  DB_CONNECTION_COUNT: 'db_connection_count',
  
  // AI metrics
  AI_REQUEST_COUNT: 'ai_request_count',
  AI_REQUEST_DURATION: 'ai_request_duration',
  AI_ERROR_COUNT: 'ai_error_count',
  AI_TOKEN_COUNT: 'ai_token_count',
  
  // File processing metrics
  FILE_UPLOAD_COUNT: 'file_upload_count',
  FILE_UPLOAD_SIZE: 'file_upload_size',
  FILE_PROCESSING_DURATION: 'file_processing_duration',
  FILE_PROCESSING_ERROR_COUNT: 'file_processing_error_count',
  
  // User metrics
  USER_LOGIN_COUNT: 'user_login_count',
  USER_SIGNUP_COUNT: 'user_signup_count',
  USER_SESSION_DURATION: 'user_session_duration',
  
  // System metrics
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage',
  ACTIVE_CONNECTIONS: 'active_connections',
}
