/**
 * Session Management
 * Provides utilities for managing user sessions with automatic cleanup
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import type { UserRole } from './server';

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSessionOptions {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create a new session
 */
export async function createSession(
  options: CreateSessionOptions,
  db: PrismaClient = prisma
): Promise<Session> {
  const expiresAt = new Date(Date.now() + options.expiresIn * 1000);
  
  const session = await db.userSession.create({
    data: {
      userId: options.userId,
      token: options.accessToken,
      refreshToken: options.refreshToken,
      expiresAt,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      lastActivityAt: new Date(),
    },
  });
  
  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Get a session by access token
 */
export async function getSessionByToken(
  token: string,
  db: PrismaClient = prisma
): Promise<Session | null> {
  const session = await db.userSession.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
  
  if (!session) {
    return null;
  }
  
  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Get a session by refresh token
 */
export async function getSessionByRefreshToken(
  refreshToken: string,
  db: PrismaClient = prisma
): Promise<Session | null> {
  const session = await db.userSession.findFirst({
    where: {
      refreshToken,
    },
  });
  
  if (!session) {
    return null;
  }
  
  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Update session tokens
 */
export async function updateSessionTokens(
  sessionId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  db: PrismaClient = prisma
): Promise<Session | null> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  
  const session = await db.userSession.update({
    where: { id: sessionId },
    data: {
      token: accessToken,
      refreshToken,
      expiresAt,
      lastActivityAt: new Date(),
    },
  });
  
  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  };
}

/**
 * Update session last activity time
 */
export async function updateSessionActivity(
  sessionId: string,
  db: PrismaClient = prisma
): Promise<void> {
  await db.userSession.update({
    where: { id: sessionId },
    data: {
      lastActivityAt: new Date(),
    },
  });
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(
  sessionId: string,
  db: PrismaClient = prisma
): Promise<void> {
  await db.userSession.delete({
    where: { id: sessionId },
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(
  userId: string,
  db: PrismaClient = prisma
): Promise<number> {
  const result = await db.userSession.deleteMany({
    where: { userId },
  });
  
  return result.count;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(
  db: PrismaClient = prisma
): Promise<number> {
  const result = await db.userSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  
  return result.count;
}

/**
 * Clean up inactive sessions (no activity for specified days)
 */
export async function cleanupInactiveSessions(
  inactiveDays: number = 30,
  db: PrismaClient = prisma
): Promise<number> {
  const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);
  
  const result = await db.userSession.deleteMany({
    where: {
      lastActivityAt: {
        lt: cutoffDate,
      },
    },
  });
  
  return result.count;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(
  userId: string,
  db: PrismaClient = prisma
): Promise<Session[]> {
  const sessions = await db.userSession.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      lastActivityAt: 'desc',
    },
  });
  
  return sessions.map(session => ({
    id: session.id,
    userId: session.userId,
    token: session.token,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    ipAddress: session.ipAddress || undefined,
    userAgent: session.userAgent || undefined,
  }));
}

/**
 * Get session count for a user
 */
export async function getUserSessionCount(
  userId: string,
  db: PrismaClient = prisma
): Promise<number> {
  return db.userSession.count({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

/**
 * Limit concurrent sessions per user
 */
export async function enforceSessionLimit(
  userId: string,
  maxSessions: number = 5,
  db: PrismaClient = prisma
): Promise<void> {
  const sessions = await db.userSession.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      lastActivityAt: 'desc',
    },
  });
  
  // Keep only the most recent sessions up to the limit
  const sessionsToDelete = sessions.slice(maxSessions);
  
  if (sessionsToDelete.length > 0) {
    await db.userSession.deleteMany({
      where: {
        id: {
          in: sessionsToDelete.map(s => s.id),
        },
      },
    });
  }
}
