/**
 * In-Memory Cache Strategy
 * Simple in-memory caching with TTL and tag-based invalidation
 */

import type { CacheEntry, CacheOptions, CacheStats, CacheStrategy, CacheKey } from './types';
import { getLogger, LogCategory } from '../logging';

const logger = getLogger(LogCategory.SYSTEM);

export class InMemoryCache implements CacheStrategy {
  private cache: Map<string, CacheEntry> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
  };

  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Stop cleanup interval (useful for testing)
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired entries from cache
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry, now)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.stats.size = this.cache.size;
      logger.debug('Cache cleanup', { removedCount, remainingSize: this.cache.size });
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry, now: number = Date.now()): boolean {
    return now - entry.timestamp > entry.ttl;
  }

  /**
   * Normalize cache key to string
   */
  private normalizeKey(key: CacheKey): string {
    return typeof key === 'string' ? key : key.toString();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(normalizedKey);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(key: CacheKey, value: T, options?: CacheOptions): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const ttl = options?.ttl ?? this.defaultTTL;
    const tags = options?.tags ?? [];

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      key: normalizedKey,
    };

    this.cache.set(normalizedKey, entry);
    this.stats.sets++;
    this.stats.size = this.cache.size;

    // Store tag associations
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(normalizedKey);
    }

    logger.debug('Cache set', { key: normalizedKey, ttl, tags, size: this.cache.size });
  }

  /**
   * Delete value from cache
   */
  async delete(key: CacheKey): Promise<void> {
    const normalizedKey = this.normalizeKey(key);
    const deleted = this.cache.delete(normalizedKey);
    
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      
      // Remove from all tags
      for (const [tag, keys] of this.tags.entries()) {
        keys.delete(normalizedKey);
        if (keys.size === 0) {
          this.tags.delete(tag);
        }
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.tags.clear();
    this.stats.size = 0;
    logger.info('Cache cleared');
  }

  /**
   * Check if key exists in cache
   */
  async has(key: CacheKey): Promise<boolean> {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.cache.get(normalizedKey);
    
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(normalizedKey);
      this.stats.size = this.cache.size;
      return false;
    }

    return true;
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.tags.get(tag);
    
    if (!keys) {
      return;
    }

    let deletedCount = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deletedCount++;
      }
    }

    this.tags.delete(tag);
    this.stats.deletes += deletedCount;
    this.stats.size = this.cache.size;

    logger.info('Cache invalidated by tag', { tag, deletedCount });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: this.cache.size,
    };
  }
}

// Singleton instance
export const inMemoryCache = new InMemoryCache();
