/**
 * Cache Utilities
 * Helper functions for common caching patterns
 */

import { cacheManager, type CacheKeyConfig, type CacheTag } from './cache-manager';
import type { CacheOptions } from './types';

/**
 * Higher-order function to wrap an async function with caching
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyPrefix: string,
  options?: {
    ttl?: number;
    tags?: CacheTag[];
    keyGenerator?: (...args: Parameters<T>) => CacheKeyConfig;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const keyConfig = options?.keyGenerator 
      ? options.keyGenerator(...args)
      : { prefix: keyPrefix, params: { args } };

    const cacheOptions: CacheOptions = {
      ttl: options?.ttl,
      tags: options?.tags,
    };

    return cacheManager.getOrSet(keyConfig, () => fn(...args), cacheOptions);
  }) as T;
}

/**
 * Cache decorator (for class methods)
 */
export function Cached(
  keyPrefix: string,
  options?: {
    ttl?: number;
    tags?: CacheTag[];
  }
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const keyConfig: CacheKeyConfig = {
        prefix: `${keyPrefix}:${propertyKey}`,
        params: { args },
      };

      const cacheOptions: CacheOptions = {
        ttl: options?.ttl,
        tags: options?.tags,
      };

      return cacheManager.getOrSet(
        keyConfig,
        () => originalMethod.apply(this, args),
        cacheOptions
      );
    };

    return descriptor;
  };
}

/**
 * Generate cache key for candidate list
 */
export function getCandidateListCacheKey(params: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}): CacheKeyConfig {
  return {
    prefix: 'candidates:list',
    params,
  };
}

/**
 * Generate cache key for candidate detail
 */
export function getCandidateDetailCacheKey(candidateId: string): CacheKeyConfig {
  return {
    prefix: 'candidates:detail',
    params: { id: candidateId },
  };
}

/**
 * Generate cache key for session detail
 */
export function getSessionDetailCacheKey(sessionId: string): CacheKeyConfig {
  return {
    prefix: 'sessions:detail',
    params: { id: sessionId },
  };
}

/**
 * Generate cache key for metrics
 */
export function getMetricsCacheKey(type: string, timeRange?: string): CacheKeyConfig {
  return {
    prefix: 'metrics',
    params: { type, timeRange },
  };
}
