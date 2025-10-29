/**
 * Cache Module
 * Centralized caching layer for API responses and data
 */

// Types
export type { 
  CacheEntry, 
  CacheOptions, 
  CacheStats, 
  CacheStrategy, 
  CacheKey 
} from './types';

export type { CacheKeyConfig, CacheTag } from './cache-manager';

// Implementations
export { InMemoryCache, inMemoryCache } from './in-memory-cache';
export { CacheManager, cacheManager, CacheTags } from './cache-manager';

// Middleware
export {
  invalidateCacheForRequest,
  createCacheInvalidationMiddleware,
  invalidateCache,
  clearAllCache
} from './middleware';

// Utilities
export { withCache } from './utils';
