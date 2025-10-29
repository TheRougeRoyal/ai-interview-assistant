/**
 * Audit logging system for tracking user actions and system events
 */

import { PrismaClient } from '@prisma/client'
import { getLogger } from '@/lib/logging'
import { getCorrelationId } from '@/lib/errors'

const prisma = new PrismaClient()
const logger = getLogger()

export interface AuditLogEntry {
  // User information
  userId?: string
  userEmail?: string
  userName?: string

  // Action details
  action: string
  resource: string
  resourceId?: string

  // Request context
  method?: string
  path?: string
  ipAddress?: string
  userAgent?: string

  // Action metadata
  changes?: Record<string, any>
  metadata?: Record<string, any>

  // Result
  status: 'success' | 'failure' | 'error'
  statusCode?: number
  errorMessage?: string

  // Timing
  duration?: number

  // Correlation
  correlationId?: string
  sessionId?: string
}

/**
 * Audit logger class
 */
export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          userEmail: entry.userEmail,
          userName: entry.userName,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          method: entry.method,
          path: entry.path,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          status: entry.status,
          statusCode: entry.statusCode,
          errorMessage: entry.errorMessage,
          duration: entry.duration,
          correlationId: entry.correlationId || getCorrelationId(),
          sessionId: entry.sessionId,
        },
      })

      logger.debug('Audit log entry created', {
        action: entry.action,
        resource: entry.resource,
        userId: entry.userId,
        status: entry.status,
      })
    } catch (error) {
      logger.error('Failed to create audit log entry', error instanceof Error ? error : new Error(String(error)), {
        entry,
      })
    }
  }

  /**
   * Log successful action
   */
  async logSuccess(
    action: string,
    resource: string,
    userId?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      userId,
      resourceId,
      metadata,
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log failed action
   */
  async logFailure(
    action: string,
    resource: string,
    errorMessage: string,
    userId?: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource,
      userId,
      resourceId,
      metadata,
      status: 'failure',
      statusCode: 400,
      errorMessage,
    })
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      userEmail,
      action: 'user.login',
      resource: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string, sessionId?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user.logout',
      resource: 'user',
      resourceId: userId,
      sessionId,
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log user registration
   */
  async logRegistration(userId: string, userEmail: string, ipAddress?: string): Promise<void> {
    await this.log({
      userId,
      userEmail,
      action: 'user.register',
      resource: 'user',
      resourceId: userId,
      ipAddress,
      status: 'success',
      statusCode: 201,
    })
  }

  /**
   * Log candidate creation
   */
  async logCandidateCreated(candidateId: string, userId?: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      userId,
      action: 'candidate.create',
      resource: 'candidate',
      resourceId: candidateId,
      metadata,
      status: 'success',
      statusCode: 201,
    })
  }

  /**
   * Log candidate update
   */
  async logCandidateUpdated(
    candidateId: string,
    userId?: string,
    changes?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: 'candidate.update',
      resource: 'candidate',
      resourceId: candidateId,
      changes,
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log answer submission
   */
  async logAnswerSubmitted(answerId: string, candidateId: string, metadata?: Record<string, any>): Promise<void> {
    await this.log({
      action: 'answer.submit',
      resource: 'answer',
      resourceId: answerId,
      metadata: { ...metadata, candidateId },
      status: 'success',
      statusCode: 201,
    })
  }

  /**
   * Log answer scoring
   */
  async logAnswerScored(
    answerId: string,
    reviewerId: string,
    score: number,
    feedback?: string
  ): Promise<void> {
    await this.log({
      userId: reviewerId,
      action: 'answer.score',
      resource: 'answer',
      resourceId: answerId,
      metadata: { score, feedback },
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log file upload
   */
  async logFileUpload(
    userId?: string,
    filename?: string,
    fileSize?: number,
    mimeType?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'file.upload',
      resource: 'file',
      metadata: { filename, fileSize, mimeType },
      status: 'success',
      statusCode: 200,
    })
  }

  /**
   * Log failed file upload
   */
  async logFileUploadFailure(
    errorMessage: string,
    userId?: string,
    filename?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'file.upload',
      resource: 'file',
      metadata: { filename },
      status: 'failure',
      statusCode: 400,
      errorMessage,
    })
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filters: {
    userId?: string
    action?: string
    resource?: string
    status?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  }): Promise<any[]> {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.resource) where.resource = filters.resource
    if (filters.status) where.status = filters.status

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    })
  }

  /**
   * Get audit log statistics
   */
  async getStats(filters: {
    userId?: string
    startDate?: Date
    endDate?: Date
  }): Promise<{
    total: number
    byAction: Record<string, number>
    byResource: Record<string, number>
    byStatus: Record<string, number>
  }> {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) where.timestamp.gte = filters.startDate
      if (filters.endDate) where.timestamp.lte = filters.endDate
    }

    const logs = await prisma.auditLog.findMany({ where })

    const byAction: Record<string, number> = {}
    const byResource: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1
      byResource[log.resource] = (byResource[log.resource] || 0) + 1
      byStatus[log.status] = (byStatus[log.status] || 0) + 1
    }

    return {
      total: logs.length,
      byAction,
      byResource,
      byStatus,
    }
  }

  /**
   * Delete old audit logs
   */
  async cleanup(olderThan: Date): Promise<number> {
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: olderThan,
        },
      },
    })

    logger.info('Audit logs cleaned up', { deletedCount: result.count, olderThan })

    return result.count
  }
}

/**
 * Global audit logger instance
 */
export const auditLogger = new AuditLogger()

/**
 * Audit logging utilities
 */
export const Audit = {
  log: (entry: AuditLogEntry) => auditLogger.log(entry),
  logSuccess: (action: string, resource: string, userId?: string, resourceId?: string, metadata?: Record<string, any>) =>
    auditLogger.logSuccess(action, resource, userId, resourceId, metadata),
  logFailure: (action: string, resource: string, errorMessage: string, userId?: string, resourceId?: string, metadata?: Record<string, any>) =>
    auditLogger.logFailure(action, resource, errorMessage, userId, resourceId, metadata),
  logLogin: (userId: string, userEmail: string, ipAddress?: string, userAgent?: string) =>
    auditLogger.logLogin(userId, userEmail, ipAddress, userAgent),
  logLogout: (userId: string, sessionId?: string) =>
    auditLogger.logLogout(userId, sessionId),
  logRegistration: (userId: string, userEmail: string, ipAddress?: string) =>
    auditLogger.logRegistration(userId, userEmail, ipAddress),
  logCandidateCreated: (candidateId: string, userId?: string, metadata?: Record<string, any>) =>
    auditLogger.logCandidateCreated(candidateId, userId, metadata),
  logCandidateUpdated: (candidateId: string, userId?: string, changes?: Record<string, any>) =>
    auditLogger.logCandidateUpdated(candidateId, userId, changes),
  logAnswerSubmitted: (answerId: string, candidateId: string, metadata?: Record<string, any>) =>
    auditLogger.logAnswerSubmitted(answerId, candidateId, metadata),
  logAnswerScored: (answerId: string, reviewerId: string, score: number, feedback?: string) =>
    auditLogger.logAnswerScored(answerId, reviewerId, score, feedback),
  logFileUpload: (userId?: string, filename?: string, fileSize?: number, mimeType?: string) =>
    auditLogger.logFileUpload(userId, filename, fileSize, mimeType),
  logFileUploadFailure: (errorMessage: string, userId?: string, filename?: string) =>
    auditLogger.logFileUploadFailure(errorMessage, userId, filename),
  getLogs: (filters: any) => auditLogger.getLogs(filters),
  getStats: (filters: any) => auditLogger.getStats(filters),
  cleanup: (olderThan: Date) => auditLogger.cleanup(olderThan),
}
