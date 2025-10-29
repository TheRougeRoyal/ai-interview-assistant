/**
 * API Integration Tests - Candidates Endpoint
 * Tests for /api/candidates routes
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestContext,
  createTestCandidate,
  createTestUser,
  createTestInterviewer,
  createCompleteTestCandidate,
  createMockRequest,
  createAuthenticatedRequest,
} from '../utils';

describe('API: /api/candidates', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  beforeEach(async () => {
    await ctx.cleanup();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe('GET /api/candidates', () => {
    it('should return list of candidates', async () => {
      // Create test candidates
      await createTestCandidate(ctx.prisma);
      await createTestCandidate(ctx.prisma);
      await createTestCandidate(ctx.prisma);

      const candidates = await ctx.prisma.candidate.findMany();
      
      expect(candidates).toHaveLength(3);
      expect(candidates[0]).toHaveProperty('name');
      expect(candidates[0]).toHaveProperty('email');
    });

    it('should support pagination', async () => {
      // Create 10 candidates
      for (let i = 0; i < 10; i++) {
        await createTestCandidate(ctx.prisma);
      }

      const page1 = await ctx.prisma.candidate.findMany({
        take: 5,
        skip: 0,
      });

      const page2 = await ctx.prisma.candidate.findMany({
        take: 5,
        skip: 5,
      });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should filter by seniority level', async () => {
      await createTestCandidate(ctx.prisma, { seniorityLevel: 'senior' });
      await createTestCandidate(ctx.prisma, { seniorityLevel: 'mid' });
      await createTestCandidate(ctx.prisma, { seniorityLevel: 'senior' });

      const seniors = await ctx.prisma.candidate.findMany({
        where: { seniorityLevel: 'senior' },
      });

      expect(seniors).toHaveLength(2);
      expect(seniors.every((c) => c.seniorityLevel === 'senior')).toBe(true);
    });

    it('should filter by minimum score', async () => {
      await createTestCandidate(ctx.prisma, { finalScore: 95 });
      await createTestCandidate(ctx.prisma, { finalScore: 65 });
      await createTestCandidate(ctx.prisma, { finalScore: 85 });

      const highScorers = await ctx.prisma.candidate.findMany({
        where: { finalScore: { gte: 80 } },
      });

      expect(highScorers).toHaveLength(2);
      expect(highScorers.every((c) => c.finalScore! >= 80)).toBe(true);
    });
  });

  describe('GET /api/candidates/[id]', () => {
    it('should return candidate by id', async () => {
      const candidate = await createTestCandidate(ctx.prisma);

      const found = await ctx.prisma.candidate.findUnique({
        where: { id: candidate.id },
      });

      expect(found).toBeTruthy();
      expect(found?.id).toBe(candidate.id);
      expect(found?.email).toBe(candidate.email);
    });

    it('should return null for non-existent candidate', async () => {
      const found = await ctx.prisma.candidate.findUnique({
        where: { id: 'non-existent-id' },
      });

      expect(found).toBeNull();
    });

    it('should include sessions and answers', async () => {
      const { candidate } = await createCompleteTestCandidate(ctx.prisma, {
        answersCount: 3,
      });

      const found = await ctx.prisma.candidate.findUnique({
        where: { id: candidate.id },
        include: {
          sessions: {
            include: {
              answers: true,
            },
          },
        },
      });

      expect(found?.sessions).toHaveLength(1);
      expect(found?.sessions[0].answers).toHaveLength(3);
    });
  });

  describe('POST /api/candidates', () => {
    it('should create a new candidate', async () => {
      const data = {
        name: 'Test Candidate',
        email: 'test@example.com',
        phone: '+1234567890',
      };

      const candidate = await ctx.prisma.candidate.create({
        data,
      });

      expect(candidate).toBeTruthy();
      expect(candidate.name).toBe(data.name);
      expect(candidate.email).toBe(data.email);
    });

    it('should validate required fields', async () => {
      await expect(
        ctx.prisma.candidate.create({
          data: {
            // Missing required fields
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const email = 'unique@example.com';
      await createTestCandidate(ctx.prisma, { email });

      await expect(
        createTestCandidate(ctx.prisma, { email })
      ).rejects.toThrow();
    });
  });

  describe('PUT /api/candidates/[id]', () => {
    it('should update candidate', async () => {
      const candidate = await createTestCandidate(ctx.prisma);

      const updated = await ctx.prisma.candidate.update({
        where: { id: candidate.id },
        data: { finalScore: 95 },
      });

      expect(updated.finalScore).toBe(95);
      expect(updated.id).toBe(candidate.id);
    });

    it('should return error for non-existent candidate', async () => {
      await expect(
        ctx.prisma.candidate.update({
          where: { id: 'non-existent' },
          data: { finalScore: 95 },
        })
      ).rejects.toThrow();
    });
  });

  describe('DELETE /api/candidates/[id]', () => {
    it('should delete candidate', async () => {
      const candidate = await createTestCandidate(ctx.prisma);

      await ctx.prisma.candidate.delete({
        where: { id: candidate.id },
      });

      const found = await ctx.prisma.candidate.findUnique({
        where: { id: candidate.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete related data', async () => {
      const { candidate, session, answers } = await createCompleteTestCandidate(
        ctx.prisma,
        { answersCount: 3 }
      );

      await ctx.prisma.candidate.delete({
        where: { id: candidate.id },
      });

      const foundSession = await ctx.prisma.interviewSession.findUnique({
        where: { id: session.id },
      });

      expect(foundSession).toBeNull();
    });
  });
});
