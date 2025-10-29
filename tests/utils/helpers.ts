/**
 * Test Helpers
 * Common utilities for testing
 */

import type { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Create a mock Next.js request
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
    searchParams = {},
  } = options;

  const urlObj = new URL(url);
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(
  userId: string,
  options: Parameters<typeof createMockRequest>[0] = {}
): NextRequest {
  return createMockRequest({
    ...options,
    headers: {
      ...options.headers,
      'x-user-id': userId,
      Authorization: `Bearer mock-token-${userId}`,
    },
  });
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
  }
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options || {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Expect async function to throw
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  errorMatcher?: RegExp | string
): Promise<void> {
  let error: Error | null = null;

  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }

  if (!error) {
    throw new Error('Expected function to throw, but it did not');
  }

  if (errorMatcher) {
    const message = error.message;
    const matches =
      typeof errorMatcher === 'string'
        ? message.includes(errorMatcher)
        : errorMatcher.test(message);

    if (!matches) {
      throw new Error(
        `Expected error message to match ${errorMatcher}, but got: ${message}`
      );
    }
  }
}

/**
 * Create a spy function
 */
export function createSpy<T extends (...args: any[]) => any>(): {
  fn: T;
  calls: any[][];
  results: any[];
  reset: () => void;
} {
  const calls: Array<any[]> = [];
  const results: Array<any> = [];

  const fn = ((...args: any[]) => {
    calls.push(args);
    const result = undefined;
    results.push(result);
    return result;
  }) as T;

  return {
    fn,
    calls,
    results,
    reset: () => {
      calls.length = 0;
      results.length = 0;
    },
  };
}

/**
 * Mock timer utilities
 */
export class MockTimer {
  private currentTime = Date.now();
  private timers: Array<{ callback: () => void; time: number }> = [];

  now(): number {
    return this.currentTime;
  }

  setTimeout(callback: () => void, ms: number): void {
    this.timers.push({ callback, time: this.currentTime + ms });
    this.timers.sort((a, b) => a.time - b.time);
  }

  tick(ms: number): void {
    this.currentTime += ms;
    const toRun = this.timers.filter((t) => t.time <= this.currentTime);
    this.timers = this.timers.filter((t) => t.time > this.currentTime);
    toRun.forEach((t) => t.callback());
  }

  reset(): void {
    this.currentTime = Date.now();
    this.timers = [];
  }
}

/**
 * Snapshot testing helper
 */
export function createSnapshot(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Compare snapshots
 */
export function compareSnapshots(
  actual: any,
  expected: any,
  options?: { ignoreFields?: string[] }
): boolean {
  const { ignoreFields = [] } = options || {};

  const normalize = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(normalize);
    }
    if (obj && typeof obj === 'object') {
      const normalized: any = {};
      Object.keys(obj).forEach((key) => {
        if (!ignoreFields.includes(key)) {
          normalized[key] = normalize(obj[key]);
        }
      });
      return normalized;
    }
    return obj;
  };

  const actualNormalized = normalize(actual);
  const expectedNormalized = normalize(expected);

  return (
    JSON.stringify(actualNormalized, null, 2) ===
    JSON.stringify(expectedNormalized, null, 2)
  );
}

/**
 * Random data generators (simple alternatives to faker)
 */
export const random = {
  string: (length = 10): string => {
    return Math.random().toString(36).substring(2, length + 2);
  },

  number: (min = 0, max = 100): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  email: (): string => {
    return `test-${random.string()}@example.com`;
  },

  boolean: (): boolean => {
    return Math.random() > 0.5;
  },

  arrayElement: <T>(arr: T[]): T => {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  uuid: (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
};

/**
 * Database transaction test helper
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as PrismaClient);
  });
}

/**
 * Cleanup helper for tests
 */
export function createCleanupManager() {
  const cleanupFns: Array<() => void | Promise<void>> = [];

  return {
    add: (fn: () => void | Promise<void>) => {
      cleanupFns.push(fn);
    },
    cleanup: async () => {
      for (const fn of cleanupFns.reverse()) {
        await fn();
      }
      cleanupFns.length = 0;
    },
  };
}
