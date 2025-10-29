/**
 * Log transport implementations for different output destinations
 */

import { writeFile, appendFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import {
  LogTransport,
  LogEntry,
  LogLevel,
  LogFormatter,
  LOG_LEVEL_COLORS,
  COLOR_RESET
} from './types'

/**
 * Console transport for development logging
 */
export class ConsoleTransport implements LogTransport {
  name = 'console'
  level: LogLevel
  private formatter: LogFormatter
  private enableColors: boolean

  constructor(
    level: LogLevel = LogLevel.INFO,
    formatter?: LogFormatter,
    enableColors: boolean = true
  ) {
    this.level = level
    this.enableColors = enableColors && process.stdout.isTTY
    this.formatter = formatter || this.defaultFormatter.bind(this)
  }

  private defaultFormatter(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const category = entry.category.toUpperCase().padEnd(12)
    const correlationId = entry.correlationId ? ` [${entry.correlationId.slice(-8)}]` : ''
    
    let message = `${timestamp} ${level} ${category}${correlationId} ${entry.message}`
    
    if (entry.error) {
      message += `\n  Error: ${entry.error.message}`
      if (entry.error.stack) {
        message += `\n  Stack: ${entry.error.stack}`
      }
    }
    
    if (entry.performance) {
      message += ` (${entry.performance.duration}ms)`
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`
    }

    if (this.enableColors) {
      const color = LOG_LEVEL_COLORS[entry.level] || ''
      return `${color}${message}${COLOR_RESET}`
    }

    return message
  }

  write(entry: LogEntry): void {
    const formatted = this.formatter(entry)
    
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      console.error(formatted)
    } else {
      console.log(formatted)
    }
  }
}

/**
 * File transport for persistent logging
 */
export class FileTransport implements LogTransport {
  name = 'file'
  level: LogLevel
  private filePath: string
  private formatter: LogFormatter
  private maxFileSize: number
  private maxFiles: number

  constructor(
    filePath: string,
    level: LogLevel = LogLevel.INFO,
    formatter?: LogFormatter,
    maxFileSize: number = 10 * 1024 * 1024, // 10MB
    maxFiles: number = 5
  ) {
    this.filePath = filePath
    this.level = level
    this.maxFileSize = maxFileSize
    this.maxFiles = maxFiles
    this.formatter = formatter || this.defaultFormatter.bind(this)
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  private defaultFormatter(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n'
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      await this.ensureDirectoryExists()
      const formatted = this.formatter(entry)
      await appendFile(this.filePath, formatted, 'utf8')
      
      // TODO: Implement log rotation when file size exceeds maxFileSize
    } catch (error) {
      console.error(`Error writing to file transport: ${error}`)
    }
  }

  async flush(): Promise<void> {
    // File system automatically flushes, but we could implement buffering here
  }
}

/**
 * JSON file transport for structured logging
 */
export class JsonFileTransport implements LogTransport {
  name = 'json-file'
  level: LogLevel
  private filePath: string
  private maxFileSize: number
  private maxFiles: number

  constructor(
    filePath: string,
    level: LogLevel = LogLevel.INFO,
    maxFileSize: number = 10 * 1024 * 1024, // 10MB
    maxFiles: number = 5
  ) {
    this.filePath = filePath
    this.level = level
    this.maxFileSize = maxFileSize
    this.maxFiles = maxFiles
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      await this.ensureDirectoryExists()
      const jsonLine = JSON.stringify(entry) + '\n'
      await appendFile(this.filePath, jsonLine, 'utf8')
    } catch (error) {
      console.error(`Error writing to JSON file transport: ${error}`)
    }
  }

  async flush(): Promise<void> {
    // File system automatically flushes
  }
}

/**
 * Memory transport for testing and debugging
 */
export class MemoryTransport implements LogTransport {
  name = 'memory'
  level: LogLevel
  private logs: LogEntry[] = []
  private maxLogs: number

  constructor(level: LogLevel = LogLevel.DEBUG, maxLogs: number = 1000) {
    this.level = level
    this.maxLogs = maxLogs
  }

  write(entry: LogEntry): void {
    this.logs.push(entry)
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category)
  }

  clear(): void {
    this.logs = []
  }

  flush(): void {
    // Nothing to flush for memory transport
  }
}

/**
 * HTTP transport for sending logs to external services
 */
export class HttpTransport implements LogTransport {
  name = 'http'
  level: LogLevel
  private endpoint: string
  private headers: Record<string, string>
  private batchSize: number
  private flushInterval: number
  private buffer: LogEntry[] = []
  private timer?: NodeJS.Timeout

  constructor(
    endpoint: string,
    level: LogLevel = LogLevel.ERROR,
    headers: Record<string, string> = {},
    batchSize: number = 10,
    flushInterval: number = 5000 // 5 seconds
  ) {
    this.endpoint = endpoint
    this.level = level
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    }
    this.batchSize = batchSize
    this.flushInterval = flushInterval
    this.startFlushTimer()
  }

  private startFlushTimer(): void {
    this.timer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry)
    
    if (this.buffer.length >= this.batchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const logsToSend = [...this.buffer]
    this.buffer = []

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ logs: logsToSend })
      })

      if (!response.ok) {
        console.error(`HTTP transport failed: ${response.status} ${response.statusText}`)
        // Put logs back in buffer for retry (simple strategy)
        this.buffer.unshift(...logsToSend)
      }
    } catch (error) {
      console.error(`HTTP transport error: ${error}`)
      // Put logs back in buffer for retry
      this.buffer.unshift(...logsToSend)
    }
  }

  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
    }
    await this.flush()
  }
}

/**
 * Filtered transport wrapper
 */
export class FilteredTransport implements LogTransport {
  name: string
  level: LogLevel
  private transport: LogTransport
  private filter: (entry: LogEntry) => boolean

  constructor(
    transport: LogTransport,
    filter: (entry: LogEntry) => boolean
  ) {
    this.transport = transport
    this.filter = filter
    this.name = `filtered-${transport.name}`
    this.level = transport.level
  }

  write(entry: LogEntry): void | Promise<void> {
    if (this.filter(entry)) {
      return this.transport.write(entry)
    }
  }

  flush(): void | Promise<void> {
    return this.transport.flush?.()
  }

  close(): void | Promise<void> {
    return this.transport.close?.()
  }
}