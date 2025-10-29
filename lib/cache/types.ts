/**
 * Cache Types and Interfaces
 * Defines types for the caching layer
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
  key: string;
}

export interface CacheOptions {
  ttl?: number; // Time-to-live in milliseconds
  tags?: string[]; // Tags for cache invalidation
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

export type CacheKey = string | { toString(): string };

export interface CacheStrategy {
  get<T>(key: CacheKey): Promise<T | null>;
  set<T>(key: CacheKey, value: T, options?: CacheOptions): Promise<void>;
  delete(key: CacheKey): Promise<void>;
  clear(): Promise<void>;
  has(key: CacheKey): Promise<boolean>;
  invalidateByTag(tag: string): Promise<void>;
  getStats(): CacheStats;
}
