/**
 * Cache Manager
 * High-level API for caching with automatic key generation and tag management
 */

import type { CacheStrategy, CacheOptions } from './types';
import { inMemoryCache } from './in-memory-cache';
import { getLogger, LogCategory } from '../logging';

const logger = getLogger(LogCategory.SYSTEM);

export interface CacheKeyConfig {
  prefix: string;
  params?: Record<string, any>;
}

export class CacheManager {
  private strategy: CacheStrategy;

  constructor(strategy: CacheStrategy = inMemoryCache) {
    this.strategy = strategy;
  }

  /**
   * Generate a cache key from configuration
   */
  private generateKey(config: CacheKeyConfig): string {
    const { prefix, params = {} } = config;
    
    if (Object.keys(params).length === 0) {
      return prefix;
    }

    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get or compute a cached value
   */
  async getOrSet<T>(
    keyConfig: CacheKeyConfig,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const key = this.generateKey(keyConfig);

    // Try to get from cache
    const cached = await this.strategy.get<T>(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    // Cache miss - compute value
    logger.debug('Cache miss', { key });
    const value = await factory();

    // Store in cache
    await this.strategy.set(key, value, options);

    return value;
  }

  /**
   * Get a cached value
   */
  async get<T>(keyConfig: CacheKeyConfig): Promise<T | null> {
    const key = this.generateKey(keyConfig);
    return this.strategy.get<T>(key);
  }

  /**
   * Set a cached value
   */
  async set<T>(keyConfig: CacheKeyConfig, value: T, options?: CacheOptions): Promise<void> {
    const key = this.generateKey(keyConfig);
    await this.strategy.set(key, value, options);
  }

  /**
   * Delete a cached value
   */
  async delete(keyConfig: CacheKeyConfig): Promise<void> {
    const key = this.generateKey(keyConfig);
    await this.strategy.delete(key);
  }

  /**
   * Check if a key exists in cache
   */
  async has(keyConfig: CacheKeyConfig): Promise<boolean> {
    const key = this.generateKey(keyConfig);
    return this.strategy.has(key);
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    logger.info('Invalidating cache by tag', { tag });
    await this.strategy.invalidateByTag(tag);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    logger.info('Clearing all cache');
    await this.strategy.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.strategy.getStats();
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache tags for invalidation
 */
export const CacheTags = {
  CANDIDATES: 'candidates',
  CANDIDATE_LIST: 'candidate-list',
  CANDIDATE_DETAIL: 'candidate-detail',
  SESSIONS: 'sessions',
  SESSION_DETAIL: 'session-detail',
  USER: 'user',
  METRICS: 'metrics',
  HEALTH: 'health',
} as const;

export type CacheTag = typeof CacheTags[keyof typeof CacheTags];
