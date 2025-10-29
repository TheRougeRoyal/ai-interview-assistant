/**
 * Performance Tests
 * Benchmarks for critical operations
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import {
  createTestContext,
  createTestCandidate,
  seedTestDatabase,
} from '../utils';

describe('Performance Tests', () => {
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

  describe('Database Query Performance', () => {
    it('should retrieve candidates list within threshold', async () => {
      // Seed 100 candidates
      await seedTestDatabase(ctx.prisma, { candidatesCount: 100 });

      const startTime = performance.now();
      
      const candidates = await ctx.prisma.candidate.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(candidates).toHaveLength(20);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should perform candidate search efficiently', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 50 });

      const startTime = performance.now();

      const results = await ctx.prisma.candidate.findMany({
        where: {
          OR: [
            { name: { contains: 'John' } },
            { email: { contains: 'john' } },
          ],
        },
        take: 10,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });

    it('should aggregate candidate stats efficiently', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 100 });

      const startTime = performance.now();

      const stats = await ctx.prisma.candidate.aggregate({
        _count: true,
        _avg: { finalScore: true, experienceYears: true },
        _min: { finalScore: true },
        _max: { finalScore: true },
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(stats._count).toBe(100);
      expect(duration).toBeLessThan(150); // Should complete in < 150ms
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 50 });

      const startTime = performance.now();

      // Simulate 10 concurrent read requests
      const promises = Array.from({ length: 10 }, () =>
        ctx.prisma.candidate.findMany({ take: 10 })
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.length === 10)).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete in < 500ms
    });

    it('should handle concurrent writes', async () => {
      const startTime = performance.now();

      // Create 10 candidates concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        createTestCandidate(ctx.prisma, {
          email: `concurrent-${i}@example.com`,
        })
      );

      const candidates = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(candidates).toHaveLength(10);
      expect(duration).toBeLessThan(1000); // Should complete in < 1s
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory when processing many records', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 200 });

      const initialMemory = process.memoryUsage().heapUsed;

      // Process in batches
      for (let i = 0; i < 10; i++) {
        await ctx.prisma.candidate.findMany({
          take: 20,
          skip: i * 20,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Cache Performance', () => {
    it('should show improved performance with caching', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 50 });

      // First read (uncached)
      const startTime1 = performance.now();
      const result1 = await ctx.prisma.candidate.findMany({ take: 20 });
      const endTime1 = performance.now();
      const duration1 = endTime1 - startTime1;

      // Second read (potentially cached by DB)
      const startTime2 = performance.now();
      const result2 = await ctx.prisma.candidate.findMany({ take: 20 });
      const endTime2 = performance.now();
      const duration2 = endTime2 - startTime2;

      expect(result1.length).toBe(result2.length);
      // Second query should be faster or similar
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.5);
    });
  });

  describe('Indexing Benefits', () => {
    it('should query indexed fields efficiently', async () => {
      await seedTestDatabase(ctx.prisma, { candidatesCount: 100 });

      // Query by indexed field (email)
      const startTime1 = performance.now();
      const byEmail = await ctx.prisma.candidate.findUnique({
        where: { email: 'test@example.com' },
      });
      const endTime1 = performance.now();
      const indexedDuration = endTime1 - startTime1;

      // Query with filter
      const startTime2 = performance.now();
      const byScore = await ctx.prisma.candidate.findMany({
        where: { finalScore: { gte: 80 } },
        take: 10,
      });
      const endTime2 = performance.now();
      const filterDuration = endTime2 - startTime2;

      // Both should be fast
      expect(indexedDuration).toBeLessThan(20);
      expect(filterDuration).toBeLessThan(100);
    });
  });
});

/**
 * Performance Benchmarks
 * Measure baseline performance of operations
 */
describe('Performance Benchmarks', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>;

  beforeAll(async () => {
    ctx = await createTestContext();
    await seedTestDatabase(ctx.prisma, {
      candidatesCount: 100,
      usersCount: 20,
      interviewersCount: 5,
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('benchmark: candidate list query', async () => {
    const iterations = 100;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await ctx.prisma.candidate.findMany({ take: 20 });
      const end = performance.now();
      durations.push(end - start);
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    console.log(`Candidate List Query:
      Average: ${avg.toFixed(2)}ms
      Min: ${min.toFixed(2)}ms
      Max: ${max.toFixed(2)}ms
    `);

    expect(avg).toBeLessThan(50);
  });

  it('benchmark: candidate detail with relations', async () => {
    const candidate = await ctx.prisma.candidate.findFirst();
    const iterations = 50;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await ctx.prisma.candidate.findUnique({
        where: { id: candidate!.id },
        include: {
          sessions: {
            include: {
              answers: {
                include: {
                  scores: true,
                },
              },
            },
          },
        },
      });
      const end = performance.now();
      durations.push(end - start);
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    console.log(`Candidate Detail Query Average: ${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(100);
  });
});
