/**
 * API Integration Tests - Sessions Endpoint
 * Tests for /api/sessions routes
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestContext,
  createTestCandidate,
  createTestSession,
  createTestAnswer,
  createCompleteTestCandidate,
} from '../utils';

describe('API: /api/sessions', () => {
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

  describe('GET /api/sessions', () => {
    it('should return list of sessions', async () => {
      const candidate = await createTestCandidate(ctx.prisma);
      await createTestSession(ctx.prisma, candidate.id);
      await createTestSession(ctx.prisma, candidate.id);

      const sessions = await ctx.prisma.interviewSession.findMany({
        where: { candidateId: candidate.id },
      });

      expect(sessions).toHaveLength(2);
    });

    it('should filter by stage', async () => {
      const candidate = await createTestCandidate(ctx.prisma);
      await createTestSession(ctx.prisma, candidate.id, { stage: 'completed' });
      await createTestSession(ctx.prisma, candidate.id, { stage: 'in_progress' });

      const completed = await ctx.prisma.interviewSession.findMany({
        where: { stage: 'completed' },
      });

      expect(completed).toHaveLength(1);
      expect(completed[0].stage).toBe('completed');
    });
  });

  describe('GET /api/sessions/[id]', () => {
    it('should return session with answers', async () => {
      const { session, answers } = await createCompleteTestCandidate(ctx.prisma, {
        answersCount: 3,
      });

      const found = await ctx.prisma.interviewSession.findUnique({
        where: { id: session.id },
        include: { answers: true },
      });

      expect(found).toBeTruthy();
      expect(found?.answers).toHaveLength(3);
    });
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', async () => {
      const candidate = await createTestCandidate(ctx.prisma);

      const session = await ctx.prisma.interviewSession.create({
        data: {
          candidateId: candidate.id,
          stage: 'not_started',
          currentIndex: 0,
          planJson: JSON.stringify([]),
        },
      });

      expect(session).toBeTruthy();
      expect(session.candidateId).toBe(candidate.id);
    });
  });

  describe('PUT /api/sessions/[id]', () => {
    it('should update session stage', async () => {
      const candidate = await createTestCandidate(ctx.prisma);
      const session = await createTestSession(ctx.prisma, candidate.id);

      const updated = await ctx.prisma.interviewSession.update({
        where: { id: session.id },
        data: { stage: 'completed', currentIndex: 6 },
      });

      expect(updated.stage).toBe('completed');
      expect(updated.currentIndex).toBe(6);
    });
  });
});
