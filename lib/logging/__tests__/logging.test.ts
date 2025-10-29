/**
 * Tests for the logging system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  LogLevel,
  LogCategory,
  AppLogger,
  MemoryTransport,
  ConsoleTransport,
  getLogger,
  getApiLogger,
  createTimer
} from '../index'

describe('Logging System', () => {
  let memoryTransport: MemoryTransport
  let logger: AppLogger

  beforeEach(() => {
    memoryTransport = new MemoryTransport(LogLevel.DEBUG, 100)
    logger = new AppLogger({
      level: LogLevel.DEBUG,
      transports: [memoryTransport],
      enableCorrelationId: true,
      enablePerformanceLogging: true,
      enableRequestLogging: true,
      enableDatabaseLogging: true,
      enableAuthLogging: true,
      enableUserActionLogging: true,
      enableSecurityLogging: true
    })
  })

  afterEach(() => {
    memoryTransport.clear()
  })

  describe('Basic Logging', () => {
    it('should log messages at different levels', () => {
      logger.debug('Debug message')
      logger.info('Info message')
      logger.warn('Warning message')
      logger.error('Error message')

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(4)
      
      expect(logs[0].level).toBe(LogLevel.DEBUG)
      expect(logs[0].message).toBe('Debug message')
      
      expect(logs[1].level).toBe(LogLevel.INFO)
      expect(logs[1].message).toBe('Info message')
      
      expect(logs[2].level).toBe(LogLevel.WARN)
      expect(logs[2].message).toBe('Warning message')
      
      expect(logs[3].level).toBe(LogLevel.ERROR)
      expect(logs[3].message).toBe('Error message')
    })

    it('should include metadata in log entries', () => {
      logger.info('Test message', { userId: '123', action: 'test' })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].metadata).toMatchObject({ userId: '123', action: 'test' })
    })

    it('should include error details in error logs', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      logger.error('Error occurred', error)

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].error).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: 'Error stack trace'
      })
    })
  })

  describe('Specialized Logging', () => {
    it('should log API requests', () => {
      logger.logApiRequest({
        category: LogCategory.API,
        message: 'GET /api/test',
        request: {
          method: 'GET',
          url: '/api/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent'
        },
        response: {
          statusCode: 200
        },
        performance: {
          duration: 150,
          startTime: Date.now(),
          endTime: Date.now() + 150
        }
      })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe(LogCategory.API)
      expect(logs[0].message).toBe('GET /api/test')
    })

    it('should log database operations', () => {
      logger.logDatabaseOperation({
        category: LogCategory.DATABASE,
        message: 'Query users table',
        operation: {
          type: 'query',
          model: 'User',
          method: 'findMany'
        },
        performance: {
          duration: 50,
          startTime: Date.now(),
          endTime: Date.now() + 50
        }
      })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe(LogCategory.DATABASE)
    })

    it('should log authentication events', () => {
      logger.logAuthEvent({
        category: LogCategory.AUTH,
        message: 'User login attempt',
        auth: {
          action: 'login',
          userId: '123',
          email: 'test@example.com',
          success: true,
          ip: '127.0.0.1'
        }
      })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe(LogCategory.AUTH)
    })

    it('should log user actions', () => {
      logger.logUserAction({
        category: LogCategory.USER_ACTION,
        message: 'User created candidate',
        action: {
          type: 'create_candidate',
          resource: 'candidates',
          resourceId: '456',
          success: true
        }
      })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe(LogCategory.USER_ACTION)
    })

    it('should log security events', () => {
      logger.logSecurity({
        category: LogCategory.SECURITY,
        message: 'Suspicious activity detected',
        security: {
          event: 'suspicious_activity',
          severity: 'high' as any,
          details: { reason: 'multiple_failed_logins' },
          ip: '192.168.1.100'
        }
      })

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].category).toBe(LogCategory.SECURITY)
    })
  })

  describe('Logger Factory', () => {
    it('should create loggers with different categories', () => {
      const apiLogger = getApiLogger()
      const dbLogger = getLogger(LogCategory.DATABASE)

      expect(apiLogger).toBeDefined()
      expect(dbLogger).toBeDefined()
    })

    it('should create child loggers with additional metadata', () => {
      const childLogger = logger.child({ requestId: 'req-123' })
      
      childLogger.info('Child logger message')

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].metadata).toMatchObject({ requestId: 'req-123' })
    })
  })

  describe('Performance Timer', () => {
    it('should measure operation duration', () => {
      const timer = createTimer()
      
      timer.start()
      // Simulate some work
      const startTime = timer.getStartTime()
      timer.end()
      
      const duration = timer.getDuration()
      const endTime = timer.getEndTime()
      
      expect(duration).toBeGreaterThan(0)
      expect(endTime).toBeGreaterThan(startTime)
    })
  })

  describe('Log Level Filtering', () => {
    it('should filter logs based on level', () => {
      const warnLogger = new AppLogger({
        level: LogLevel.WARN,
        transports: [memoryTransport],
        enableCorrelationId: true,
        enablePerformanceLogging: true,
        enableRequestLogging: true,
        enableDatabaseLogging: true,
        enableAuthLogging: true,
        enableUserActionLogging: true,
        enableSecurityLogging: true
      })

      warnLogger.debug('Debug message') // Should be filtered out
      warnLogger.info('Info message')   // Should be filtered out
      warnLogger.warn('Warning message') // Should be logged
      warnLogger.error('Error message')  // Should be logged

      const logs = memoryTransport.getLogs()
      expect(logs).toHaveLength(2)
      expect(logs[0].level).toBe(LogLevel.WARN)
      expect(logs[1].level).toBe(LogLevel.ERROR)
    })
  })
})