/**
 * Cache Invalidation Middleware
 * Automatically invalidates cache based on HTTP method and route patterns
 */

import type { NextRequest } from 'next/server';
import { cacheManager, CacheTags, type CacheTag } from './cache-manager';
import { getLogger, LogCategory } from '../logging';

const logger = getLogger(LogCategory.API);

/**
 * Route patterns that trigger cache invalidation
 */
const INVALIDATION_RULES: Record<string, CacheTag[]> = {
  '/api/candidates': [CacheTags.CANDIDATES, CacheTags.CANDIDATE_LIST],
  '/api/candidates/[id]': [CacheTags.CANDIDATES, CacheTags.CANDIDATE_DETAIL],
  '/api/sessions': [CacheTags.SESSIONS],
  '/api/sessions/[id]': [CacheTags.SESSIONS, CacheTags.SESSION_DETAIL],
  '/api/score-answer': [CacheTags.CANDIDATES, CacheTags.SESSIONS],
  '/api/generate-question': [CacheTags.SESSIONS],
  '/api/summary': [CacheTags.CANDIDATES, CacheTags.SESSIONS],
};

/**
 * HTTP methods that trigger cache invalidation
 */
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Match a URL path against route patterns
 */
function matchRoute(pathname: string): string | null {
  // Exact match
  if (INVALIDATION_RULES[pathname]) {
    return pathname;
  }

  // Pattern matching with [id]
  for (const pattern of Object.keys(INVALIDATION_RULES)) {
    if (pattern.includes('[id]')) {
      const regex = new RegExp(
        '^' + pattern.replace('[id]', '[^/]+') + '$'
      );
      if (regex.test(pathname)) {
        return pattern;
      }
    }
  }

  return null;
}

/**
 * Invalidate cache based on request
 */
export async function invalidateCacheForRequest(request: NextRequest): Promise<void> {
  const { method, nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Only invalidate for mutation methods
  if (!MUTATION_METHODS.includes(method)) {
    return;
  }

  // Find matching route pattern
  const matchedPattern = matchRoute(pathname);
  
  if (!matchedPattern) {
    logger.debug('No cache invalidation rule for route', { method, pathname });
    return;
  }

  const tags = INVALIDATION_RULES[matchedPattern];
  
  logger.info('Invalidating cache for request', { 
    method, 
    pathname, 
    pattern: matchedPattern,
    tags 
  });

  // Invalidate all matching tags
  await Promise.all(
    tags.map(tag => cacheManager.invalidateByTag(tag))
  );
}

/**
 * Middleware factory for cache invalidation
 */
export function createCacheInvalidationMiddleware() {
  return async (request: NextRequest, next: () => Promise<Response>) => {
    // Execute the request
    const response = await next();

    // Only invalidate on successful mutations
    if (response.ok && MUTATION_METHODS.includes(request.method)) {
      try {
        await invalidateCacheForRequest(request);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Failed to invalidate cache', new Error(errorMessage), { 
          pathname: request.nextUrl.pathname 
        });
        // Don't fail the request if cache invalidation fails
      }
    }

    return response;
  };
}

/**
 * Invalidate cache for specific tags
 */
export async function invalidateCache(...tags: CacheTag[]): Promise<void> {
  logger.info('Manual cache invalidation', { tags });
  await Promise.all(
    tags.map(tag => cacheManager.invalidateByTag(tag))
  );
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  logger.info('Clearing all cache');
  await cacheManager.clear();
}
