/**
 * Query Optimization Utilities
 * Provides optimized database queries with proper indexing usage
 */

import { prisma } from './client';
import type { Prisma } from '@prisma/client';

/**
 * Optimized candidate listing with pagination and sorting
 */
export async function getCandidatesOptimized(params: {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'finalScore' | 'name' | 'experienceYears';
  sortOrder?: 'asc' | 'desc';
  seniorityLevel?: string;
  minScore?: number;
  search?: string;
}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    seniorityLevel,
    minScore,
    search,
  } = params;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.CandidateWhereInput = {};

  if (seniorityLevel) {
    where.seniorityLevel = seniorityLevel;
  }

  if (minScore !== undefined) {
    where.finalScore = { gte: minScore };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  // Execute queries in parallel
  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        finalScore: true,
        seniorityLevel: true,
        experienceYears: true,
        qualityScore: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { sessions: true },
        },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  return {
    data: candidates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + candidates.length < total,
    },
  };
}

/**
 * Optimized candidate detail with relations
 */
export async function getCandidateDetailOptimized(candidateId: string) {
  return prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        include: {
          answers: {
            include: {
              scores: {
                include: {
                  reviewer: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Optimized session listing for a candidate
 */
export async function getSessionsForCandidateOptimized(
  candidateId: string,
  params?: {
    stage?: string;
    limit?: number;
  }
) {
  const { stage, limit = 10 } = params || {};

  const where: Prisma.InterviewSessionWhereInput = {
    candidateId,
  };

  if (stage) {
    where.stage = stage;
  }

  return prisma.interviewSession.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      answers: {
        include: {
          scores: true,
        },
      },
    },
  });
}

/**
 * Optimized answers retrieval with scores
 */
export async function getAnswersWithScoresOptimized(sessionId: string) {
  return prisma.answer.findMany({
    where: { sessionId },
    orderBy: { questionIndex: 'asc' },
    include: {
      scores: {
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Batch update candidates (optimized for bulk operations)
 */
export async function batchUpdateCandidatesOptimized(
  updates: Array<{ id: string; data: Prisma.CandidateUpdateInput }>
) {
  return prisma.$transaction(
    updates.map(({ id, data }) =>
      prisma.candidate.update({
        where: { id },
        data,
      })
    )
  );
}

/**
 * Get candidate statistics (optimized aggregations)
 */
export async function getCandidateStatsOptimized() {
  const [totalCount, scoreStats, seniorityDistribution, recentCount] =
    await Promise.all([
      // Total candidates
      prisma.candidate.count(),

      // Score statistics
      prisma.candidate.aggregate({
        _avg: { finalScore: true, qualityScore: true, experienceYears: true },
        _min: { finalScore: true },
        _max: { finalScore: true },
        where: { finalScore: { not: null } },
      }),

      // Seniority level distribution
      prisma.candidate.groupBy({
        by: ['seniorityLevel'],
        _count: true,
        where: { seniorityLevel: { not: null } },
      }),

      // Recent candidates (last 7 days)
      prisma.candidate.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

  return {
    total: totalCount,
    recentCount,
    averageScore: scoreStats._avg.finalScore,
    averageQualityScore: scoreStats._avg.qualityScore,
    averageExperience: scoreStats._avg.experienceYears,
    minScore: scoreStats._min.finalScore,
    maxScore: scoreStats._max.finalScore,
    seniorityDistribution: seniorityDistribution.map((item: { seniorityLevel: string | null; _count: number }) => ({
      level: item.seniorityLevel,
      count: item._count,
    })),
  };
}

/**
 * Search candidates with full-text capabilities
 */
export async function searchCandidatesOptimized(searchTerm: string, limit = 10) {
  // For SQLite, use LIKE (contains is case-insensitive in SQLite by default)
  return prisma.candidate.findMany({
    where: {
      OR: [
        { name: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { resumeText: { contains: searchTerm } },
        { aiSummary: { contains: searchTerm } },
      ],
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      seniorityLevel: true,
      finalScore: true,
      aiSummary: true,
      createdAt: true,
    },
  });
}

/**
 * Get processing jobs with optimized queries
 */
export async function getProcessingJobsOptimized(params: {
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}) {
  const { status, userId, limit = 20, offset = 0 } = params;

  const where: Prisma.ProcessingJobWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (userId) {
    where.userId = userId;
  }

  return prisma.processingJob.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });
}

/**
 * Get audit logs with filters (optimized)
 */
export async function getAuditLogsOptimized(params: {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    userId,
    action,
    resource,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  const where: Prisma.AuditLogWhereInput = {};

  if (userId) {
    where.userId = userId;
  }

  if (action) {
    where.action = action;
  }

  if (resource) {
    where.resource = resource;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      where.timestamp.gte = startDate;
    }
    if (endDate) {
      where.timestamp.lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + logs.length < total,
    },
  };
}
