/**
 * Main logger implementation with structured logging and correlation ID support
 */

import {
  Logger,
  LogEntry,
  LogLevel,
  LogCategory,
  ApiLogEntry,
  DatabaseLogEntry,
  AuthLogEntry,
  UserActionLogEntry,
  PerformanceLogEntry,
  SecurityLogEntry,
  LogTransport,
  LoggerConfig,
  LOG_LEVEL_HIERARCHY
} from './types'
import {
  getCorrelationId,
  getRequestId,
  getCurrentUserId,
  getCurrentSessionId,
  getCorrelationMetadata
} from '@/lib/errors/correlation'

/**
 * Main logger class implementation
 */
export class AppLogger implements Logger {
  private config: LoggerConfig
  private metadata: Record<string, any>
  private correlationId?: string
  private userId?: string

  constructor(config: LoggerConfig, metadata: Record<string, any> = {}) {
    this.config = config
    this.metadata = { ...config.metadata, ...metadata }
  }

  /**
   * Create base log entry with common fields
   */
  private createBaseEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    const correlationId = this.correlationId || getCorrelationId()
    const requestId = getRequestId()
    const userId = this.userId || getCurrentUserId()
    const sessionId = getCurrentSessionId()
    const correlationMetadata = getCorrelationMetadata()

    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      correlationId,
      requestId,
      userId,
      sessionId,
      metadata: {
        ...this.metadata,
        ...correlationMetadata,
        ...metadata
      }
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_HIERARCHY[level] >= LOG_LEVEL_HIERARCHY[this.config.level]
  }

  /**
   * Write log entry to all transports
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return
    }

    const writePromises = this.config.transports
      .filter(transport => LOG_LEVEL_HIERARCHY[entry.level] >= LOG_LEVEL_HIERARCHY[transport.level])
      .map(transport => {
        try {
          return Promise.resolve(transport.write(entry))
        } catch (error) {
          console.error(`Error writing to transport ${transport.name}:`, error)
          return Promise.resolve()
        }
      })

    await Promise.allSettled(writePromises)
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createBaseEntry(LogLevel.DEBUG, this.config.category || LogCategory.SYSTEM, message, metadata)
    this.writeLog(entry)
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createBaseEntry(LogLevel.INFO, this.config.category || LogCategory.SYSTEM, message, metadata)
    this.writeLog(entry)
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createBaseEntry(LogLevel.WARN, this.config.category || LogCategory.SYSTEM, message, metadata)
    this.writeLog(entry)
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createBaseEntry(LogLevel.ERROR, this.config.category || LogCategory.SYSTEM, message, metadata)
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    this.writeLog(entry)
  }

  /**
   * Fatal level logging
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry = this.createBaseEntry(LogLevel.FATAL, this.config.category || LogCategory.SYSTEM, message, metadata)
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log API request
   */
  logApiRequest(entryData: Omit<ApiLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enableRequestLogging) return

    const entry: ApiLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(entryData: Omit<DatabaseLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enableDatabaseLogging) return

    const entry: DatabaseLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log authentication event
   */
  logAuthEvent(entryData: Omit<AuthLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enableAuthLogging) return

    const entry: AuthLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: entryData.auth.success ? LogLevel.INFO : LogLevel.WARN,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log user action
   */
  logUserAction(entryData: Omit<UserActionLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enableUserActionLogging) return

    const entry: UserActionLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log performance metrics
   */
  logPerformance(entryData: Omit<PerformanceLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enablePerformanceLogging) return

    const entry: PerformanceLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Log security event
   */
  logSecurity(entryData: Omit<SecurityLogEntry, 'timestamp' | 'level'>): void {
    if (!this.config.enableSecurityLogging) return

    const entry: SecurityLogEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      correlationId: entryData.correlationId || this.correlationId || getCorrelationId(),
      requestId: entryData.requestId || getRequestId(),
      userId: entryData.userId || this.userId || getCurrentUserId(),
      sessionId: entryData.sessionId || getCurrentSessionId(),
      metadata: {
        ...this.metadata,
        ...entryData.metadata
      }
    }

    this.writeLog(entry)
  }

  /**
   * Create child logger with additional metadata
   */
  child(metadata: Record<string, any>): Logger {
    return new AppLogger(this.config, { ...this.metadata, ...metadata })
  }

  /**
   * Create logger with specific correlation ID
   */
  withCorrelationId(correlationId: string): Logger {
    const childLogger = new AppLogger(this.config, this.metadata)
    childLogger.correlationId = correlationId
    return childLogger
  }

  /**
   * Create logger with specific user ID
   */
  withUserId(userId: string): Logger {
    const childLogger = new AppLogger(this.config, this.metadata)
    childLogger.userId = userId
    return childLogger
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    const flushPromises = this.config.transports
      .filter(transport => transport.flush)
      .map(transport => transport.flush!())

    await Promise.allSettled(flushPromises)
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    const closePromises = this.config.transports
      .filter(transport => transport.close)
      .map(transport => transport.close!())

    await Promise.allSettled(closePromises)
  }
}