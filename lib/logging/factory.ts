/**
 * Logger factory and configuration management
 */

import { join } from 'path'
import {
  Logger,
  LoggerConfig,
  LogLevel,
  LogCategory,
  LogTransport
} from './types'
import { AppLogger } from './logger'
import {
  ConsoleTransport,
  FileTransport,
  JsonFileTransport,
  MemoryTransport,
  HttpTransport,
  FilteredTransport
} from './transports'

/**
 * Environment-based logger configuration
 */
export interface EnvironmentConfig {
  development: LoggerConfig
  test: LoggerConfig
  production: LoggerConfig
}

/**
 * Default logger configurations for different environments
 */
const DEFAULT_CONFIGS: EnvironmentConfig = {
  development: {
    level: LogLevel.DEBUG,
    transports: [
      new ConsoleTransport(LogLevel.DEBUG, undefined, true),
      new JsonFileTransport(join(process.cwd(), 'logs', 'app.log'), LogLevel.INFO)
    ],
    enableCorrelationId: true,
    enablePerformanceLogging: true,
    enableRequestLogging: true,
    enableDatabaseLogging: true,
    enableAuthLogging: true,
    enableUserActionLogging: true,
    enableSecurityLogging: true
  },
  test: {
    level: LogLevel.WARN,
    transports: [
      new MemoryTransport(LogLevel.DEBUG, 1000)
    ],
    enableCorrelationId: true,
    enablePerformanceLogging: false,
    enableRequestLogging: false,
    enableDatabaseLogging: false,
    enableAuthLogging: true,
    enableUserActionLogging: false,
    enableSecurityLogging: true
  },
  production: {
    level: LogLevel.INFO,
    transports: [
      new ConsoleTransport(LogLevel.WARN, undefined, false),
      new JsonFileTransport(join(process.cwd(), 'logs', 'app.log'), LogLevel.INFO),
      new JsonFileTransport(join(process.cwd(), 'logs', 'error.log'), LogLevel.ERROR),
      // Add HTTP transport for external logging service if configured
      ...(process.env.LOG_ENDPOINT ? [
        new HttpTransport(
          process.env.LOG_ENDPOINT,
          LogLevel.ERROR,
          process.env.LOG_API_KEY ? { 'Authorization': `Bearer ${process.env.LOG_API_KEY}` } : {}
        )
      ] : [])
    ],
    enableCorrelationId: true,
    enablePerformanceLogging: true,
    enableRequestLogging: true,
    enableDatabaseLogging: false,
    enableAuthLogging: true,
    enableUserActionLogging: true,
    enableSecurityLogging: true
  }
}

/**
 * Logger factory class
 */
export class LoggerFactory {
  private static instance: LoggerFactory
  private loggers: Map<string, Logger> = new Map()
  private config: LoggerConfig
  private environment: string

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development'
    this.config = this.getEnvironmentConfig()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LoggerFactory {
    if (!LoggerFactory.instance) {
      LoggerFactory.instance = new LoggerFactory()
    }
    return LoggerFactory.instance
  }

  /**
   * Get environment-specific configuration
   */
  private getEnvironmentConfig(): LoggerConfig {
    const env = this.environment as keyof EnvironmentConfig
    return DEFAULT_CONFIGS[env] || DEFAULT_CONFIGS.development
  }

  /**
   * Create or get logger for specific category
   */
  getLogger(category: LogCategory = LogCategory.SYSTEM, metadata?: Record<string, any>): Logger {
    const key = `${category}:${JSON.stringify(metadata || {})}`
    
    if (!this.loggers.has(key)) {
      const config = {
        ...this.config,
        category
      }
      const logger = new AppLogger(config, metadata)
      this.loggers.set(key, logger)
    }

    return this.loggers.get(key)!
  }

  /**
   * Create logger with custom configuration
   */
  createLogger(config: Partial<LoggerConfig>, metadata?: Record<string, any>): Logger {
    const fullConfig = {
      ...this.config,
      ...config
    }
    return new AppLogger(fullConfig, metadata)
  }

  /**
   * Get API logger
   */
  getApiLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.API, metadata)
  }

  /**
   * Get database logger
   */
  getDatabaseLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.DATABASE, metadata)
  }

  /**
   * Get authentication logger
   */
  getAuthLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.AUTH, metadata)
  }

  /**
   * Get file processing logger
   */
  getFileProcessingLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.FILE_PROCESSING, metadata)
  }

  /**
   * Get AI service logger
   */
  getAiServiceLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.AI_SERVICE, metadata)
  }

  /**
   * Get security logger
   */
  getSecurityLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.SECURITY, metadata)
  }

  /**
   * Get performance logger
   */
  getPerformanceLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.PERFORMANCE, metadata)
  }

  /**
   * Get user action logger
   */
  getUserActionLogger(metadata?: Record<string, any>): Logger {
    return this.getLogger(LogCategory.USER_ACTION, metadata)
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
    // Clear existing loggers to force recreation with new config
    this.loggers.clear()
  }

  /**
   * Add transport to all loggers
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport)
    // Clear existing loggers to force recreation with new transport
    this.loggers.clear()
  }

  /**
   * Remove transport from all loggers
   */
  removeTransport(transportName: string): void {
    this.config.transports = this.config.transports.filter(
      transport => transport.name !== transportName
    )
    // Clear existing loggers to force recreation without the transport
    this.loggers.clear()
  }

  /**
   * Flush all loggers
   */
  async flush(): Promise<void> {
    const flushPromises = Array.from(this.loggers.values()).map(logger => {
      if (typeof (logger as any).flush === 'function') {
        return (logger as any).flush()
      }
      return Promise.resolve()
    })

    await Promise.allSettled(flushPromises)
  }

  /**
   * Close all loggers
   */
  async close(): Promise<void> {
    const closePromises = Array.from(this.loggers.values()).map(logger => {
      if (typeof (logger as any).close === 'function') {
        return (logger as any).close()
      }
      return Promise.resolve()
    })

    await Promise.allSettled(closePromises)
    this.loggers.clear()
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }

  /**
   * Get environment
   */
  getEnvironment(): string {
    return this.environment
  }
}

/**
 * Convenience functions for getting loggers
 */
export const getLogger = (category?: LogCategory, metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getLogger(category, metadata)
}

export const getApiLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getApiLogger(metadata)
}

export const getDatabaseLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getDatabaseLogger(metadata)
}

export const getAuthLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getAuthLogger(metadata)
}

export const getFileProcessingLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getFileProcessingLogger(metadata)
}

export const getAiServiceLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getAiServiceLogger(metadata)
}

export const getSecurityLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getSecurityLogger(metadata)
}

export const getPerformanceLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getPerformanceLogger(metadata)
}

export const getUserActionLogger = (metadata?: Record<string, any>): Logger => {
  return LoggerFactory.getInstance().getUserActionLogger(metadata)
}