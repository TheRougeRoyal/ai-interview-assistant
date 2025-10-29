/**
 * Logging system types and interfaces
 * Provides structured logging with correlation IDs and multiple log levels
 */

import type { ErrorSeverity } from '@/lib/errors/types'

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log categories for better organization
 */
export enum LogCategory {
  API = 'api',
  DATABASE = 'database',
  AUTH = 'auth',
  FILE_PROCESSING = 'file_processing',
  AI_SERVICE = 'ai_service',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action'
}

/**
 * Base log entry interface
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  correlationId?: string
  requestId?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  performance?: {
    duration: number
    startTime: number
    endTime: number
  }
}

/**
 * API request log entry
 */
export interface ApiLogEntry extends LogEntry {
  category: LogCategory.API
  request: {
    method: string
    url: string
    headers?: Record<string, string>
    query?: Record<string, any>
    body?: any
    ip?: string
    userAgent?: string
  }
  response?: {
    statusCode: number
    headers?: Record<string, string>
    body?: any
    size?: number
  }
  performance: {
    duration: number
    startTime: number
    endTime: number
  }
}

/**
 * Database operation log entry
 */
export interface DatabaseLogEntry extends LogEntry {
  category: LogCategory.DATABASE
  operation: {
    type: 'query' | 'mutation' | 'transaction'
    model?: string
    method?: string
    query?: string
    params?: any[]
  }
  performance?: {
    duration: number
    startTime: number
    endTime: number
  }
}

/**
 * Authentication log entry
 */
export interface AuthLogEntry extends LogEntry {
  category: LogCategory.AUTH
  auth: {
    action: 'login' | 'logout' | 'register' | 'token_refresh' | 'password_reset' | 'permission_check'
    userId?: string
    email?: string
    role?: string
    success: boolean
    reason?: string
    ip?: string
    userAgent?: string
  }
}

/**
 * User action log entry
 */
export interface UserActionLogEntry extends LogEntry {
  category: LogCategory.USER_ACTION
  action: {
    type: string
    resource?: string
    resourceId?: string
    details?: Record<string, any>
    success: boolean
  }
}

/**
 * Performance log entry
 */
export interface PerformanceLogEntry extends LogEntry {
  category: LogCategory.PERFORMANCE
  performance: {
    operation: string
    duration: number
    startTime: number
    endTime: number
    metrics?: Record<string, number>
  }
}

/**
 * Security log entry
 */
export interface SecurityLogEntry extends LogEntry {
  category: LogCategory.SECURITY
  security: {
    event: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt'
    severity: ErrorSeverity
    details: Record<string, any>
    ip?: string
    userAgent?: string
  }
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, any>): void
  info(message: string, metadata?: Record<string, any>): void
  warn(message: string, metadata?: Record<string, any>): void
  error(message: string, error?: Error, metadata?: Record<string, any>): void
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void
  
  // Specialized logging methods
  logApiRequest(entry: Omit<ApiLogEntry, 'timestamp' | 'level'>): void
  logDatabaseOperation(entry: Omit<DatabaseLogEntry, 'timestamp' | 'level'>): void
  logAuthEvent(entry: Omit<AuthLogEntry, 'timestamp' | 'level'>): void
  logUserAction(entry: Omit<UserActionLogEntry, 'timestamp' | 'level'>): void
  logPerformance(entry: Omit<PerformanceLogEntry, 'timestamp' | 'level'>): void
  logSecurity(entry: Omit<SecurityLogEntry, 'timestamp' | 'level'>): void
  
  // Context methods
  child(metadata: Record<string, any>): Logger
  withCorrelationId(correlationId: string): Logger
  withUserId(userId: string): Logger
}

/**
 * Log transport interface for different output destinations
 */
export interface LogTransport {
  name: string
  level: LogLevel
  write(entry: LogEntry): Promise<void> | void
  flush?(): Promise<void> | void
  close?(): Promise<void> | void
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel
  category?: LogCategory
  transports: LogTransport[]
  enableCorrelationId: boolean
  enablePerformanceLogging: boolean
  enableRequestLogging: boolean
  enableDatabaseLogging: boolean
  enableAuthLogging: boolean
  enableUserActionLogging: boolean
  enableSecurityLogging: boolean
  metadata?: Record<string, any>
}

/**
 * Log filter function type
 */
export type LogFilter = (entry: LogEntry) => boolean

/**
 * Log formatter function type
 */
export type LogFormatter = (entry: LogEntry) => string

/**
 * Performance timer interface
 */
export interface PerformanceTimer {
  start(): void
  end(): number
  getDuration(): number
  getStartTime(): number
  getEndTime(): number
}

/**
 * Log level hierarchy for filtering
 */
export const LOG_LEVEL_HIERARCHY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
}

/**
 * Default log level colors for console output
 */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.FATAL]: '\x1b[35m'  // Magenta
}

/**
 * Reset color code
 */
export const COLOR_RESET = '\x1b[0m'