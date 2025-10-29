/**
 * Centralized logging exports
 * Provides a single entry point for all logging utilities
 */

// Core types and interfaces
export type {
  LogEntry,
  ApiLogEntry,
  DatabaseLogEntry,
  AuthLogEntry,
  UserActionLogEntry,
  PerformanceLogEntry,
  SecurityLogEntry,
  Logger,
  LogTransport,
  LoggerConfig,
  LogFilter,
  LogFormatter,
  PerformanceTimer
} from './types'

export {
  LogLevel,
  LogCategory,
  LOG_LEVEL_HIERARCHY,
  LOG_LEVEL_COLORS,
  COLOR_RESET
} from './types'

// Logger implementation
export { AppLogger } from './logger'

// Transports
export {
  ConsoleTransport,
  FileTransport,
  JsonFileTransport,
  MemoryTransport,
  HttpTransport,
  FilteredTransport
} from './transports'

// Performance utilities
export {
  AppPerformanceTimer,
  measurePerformance,
  measureAsync,
  measureSync,
  createTimer,
  withPerformanceLogging
} from './performance'

// Factory and convenience functions
export {
  LoggerFactory,
  getLogger,
  getApiLogger,
  getDatabaseLogger,
  getAuthLogger,
  getFileProcessingLogger,
  getAiServiceLogger,
  getSecurityLogger,
  getPerformanceLogger,
  getUserActionLogger
} from './factory'

// Middleware
export {
  withApiLogging,
  withDatabaseLogging,
  logAuthEvent,
  logUserAction,
  logSecurityEvent
} from './middleware'