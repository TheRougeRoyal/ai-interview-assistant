# Performance Optimizations Guide

## Overview

This document describes the performance optimizations implemented in tasks 6, 6.1, 6.2, and 6.3, including caching, database indexing, and frontend optimizations.

## 6.1 API Response Caching

### Implementation

The caching layer provides in-memory caching with TTL (time-to-live) and tag-based invalidation.

#### Cache Manager

```typescript
import { cacheManager, CacheTags } from '@/lib/cache';

// Get or compute a cached value
const candidates = await cacheManager.getOrSet(
  { prefix: 'candidates:list', params: { page: 1, limit: 20 } },
  async () => {
    // Expensive operation
    return await fetchCandidates({ page: 1, limit: 20 });
  },
  {
    ttl: 5 * 60 * 1000, // 5 minutes
    tags: [CacheTags.CANDIDATES, CacheTags.CANDIDATE_LIST]
  }
);
```

#### Cache Invalidation

Cache is automatically invalidated on mutations:

```typescript
// Automatic invalidation on POST/PUT/PATCH/DELETE
// Configured in lib/cache/middleware.ts

// Manual invalidation
import { invalidateCache, CacheTags } from '@/lib/cache';

await invalidateCache(CacheTags.CANDIDATES, CacheTags.CANDIDATE_LIST);
```

#### Using the Cache in API Routes

```typescript
import { cacheManager, CacheTags } from '@/lib/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  
  const result = await cacheManager.getOrSet(
    { prefix: 'candidates:list', params: { page } },
    async () => {
      return await getCandidatesOptimized({ page, limit: 20 });
    },
    {
      ttl: 5 * 60 * 1000,
      tags: [CacheTags.CANDIDATES, CacheTags.CANDIDATE_LIST]
    }
  );
  
  return Response.json(result);
}
```

### Cache Statistics

```typescript
const stats = cacheManager.getStats();
console.log(`Cache hit rate: ${(stats.hits / (stats.hits + stats.misses)) * 100}%`);
```

## 6.2 Database Query Optimization

### Indexes Added

The following indexes were added to improve query performance:

#### User Model
- `email` (existing)
- `role` (new)
- `createdAt` (new)

#### Candidate Model
- `email` (existing)
- `createdAt` (new)
- `finalScore` (new)
- `seniorityLevel` (new)
- `experienceYears` (new)

#### InterviewSession Model
- `candidateId` (new)
- `stage` (new)
- `createdAt` (new)

#### Answer Model
- `sessionId` (existing)
- `difficulty` (new)
- `submittedAt` (new)

### Optimized Query Functions

Use the optimized query functions in `lib/db/queries.ts`:

```typescript
import {
  getCandidatesOptimized,
  getCandidateDetailOptimized,
  getSessionsForCandidateOptimized,
  searchCandidatesOptimized,
  getCandidateStatsOptimized
} from '@/lib/db/queries';

// Paginated candidate list with sorting
const result = await getCandidatesOptimized({
  page: 1,
  limit: 20,
  sortBy: 'finalScore',
  sortOrder: 'desc',
  minScore: 70
});

// Candidate detail with all relations
const candidate = await getCandidateDetailOptimized(candidateId);

// Search candidates
const results = await searchCandidatesOptimized('john', 10);

// Get statistics
const stats = await getCandidateStatsOptimized();
```

### Query Best Practices

1. **Use select to limit fields**:
   ```typescript
   const users = await prisma.user.findMany({
     select: { id: true, email: true, name: true }
   });
   ```

2. **Batch queries with Promise.all**:
   ```typescript
   const [candidates, total] = await Promise.all([
     prisma.candidate.findMany({ where, skip, take }),
     prisma.candidate.count({ where })
   ]);
   ```

3. **Use indexed fields in where clauses**:
   ```typescript
   // Good - uses index
   const candidates = await prisma.candidate.findMany({
     where: { seniorityLevel: 'senior', finalScore: { gte: 80 } }
   });
   ```

## 6.3 Frontend Performance Enhancements

### React.memo Optimization

Components are now memoized to prevent unnecessary re-renders:

```typescript
// CandidateTable component
export const CandidateTable = memo(({ candidates, ... }) => {
  // Component logic
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.candidates.length === nextProps.candidates.length;
});
```

### Virtual Scrolling

For large lists (>100 items), use the virtualized table:

```typescript
import { VirtualizedCandidateTable } from '@/components/dashboard/VirtualizedCandidateTable';

<VirtualizedCandidateTable
  candidates={candidates}
  sortField={sortField}
  sortOrder={sortOrder}
  onSort={handleSort}
  onRowClick={handleRowClick}
  rowHeight={73}
  overscan={5}
/>
```

### Code Splitting

Use lazy loading for route-based code splitting:

```typescript
import { 
  LazyIntervieweeDashboard,
  LazyInterviewerDashboard,
  LazyVirtualizedCandidateTable
} from '@/lib/utils/lazy-loading';

// In your component
<Suspense fallback={<DefaultLoadingComponent />}>
  <LazyIntervieweeDashboard />
</Suspense>
```

### Performance Hooks

Use memoization hooks for expensive computations:

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive calculations
const sortedCandidates = useMemo(() => 
  [...candidates].sort(compareFn),
  [candidates, sortField, sortOrder]
);

// Memoize callbacks to prevent re-renders
const handleClick = useCallback((id: string) => {
  onRowClick(id);
}, [onRowClick]);
```

## Performance Monitoring

### Cache Metrics

```typescript
import { cacheManager } from '@/lib/cache';

const stats = cacheManager.getStats();
console.log({
  hitRate: (stats.hits / (stats.hits + stats.misses)) * 100,
  size: stats.size,
  sets: stats.sets,
  deletes: stats.deletes
});
```

### Query Performance

Use the logging system to track slow queries:

```typescript
import { measureAsync } from '@/lib/logging';

const result = await measureAsync(
  'candidates.list',
  async () => {
    return await getCandidatesOptimized(params);
  }
);
```

## Migration Guide

### Applying Database Indexes

Run the Prisma migration:

```bash
npx prisma migrate dev --name add_performance_indexes
```

### Enabling Cache for Existing Routes

1. Import cache utilities:
   ```typescript
   import { cacheManager, CacheTags } from '@/lib/cache';
   ```

2. Wrap expensive operations:
   ```typescript
   const data = await cacheManager.getOrSet(
     { prefix: 'resource:key', params: queryParams },
     fetchFunction,
     { ttl: 300000, tags: [CacheTags.RESOURCE] }
   );
   ```

3. Add invalidation on mutations:
   ```typescript
   import { invalidateCache, CacheTags } from '@/lib/cache';
   
   // After successful mutation
   await invalidateCache(CacheTags.RESOURCE);
   ```

### Using Optimized Components

Replace existing components with optimized versions:

```typescript
// Before
import { CandidateTable } from '@/components/dashboard/CandidateTable';

// After (for large lists)
import { VirtualizedCandidateTable } from '@/components/dashboard/VirtualizedCandidateTable';
```

## Performance Targets

- **Cache hit rate**: > 80% for frequently accessed data
- **API response time**: < 200ms for cached responses, < 500ms for database queries
- **Frontend rendering**: < 16ms per frame (60 FPS)
- **Initial page load**: < 2s on 3G connection
- **Time to Interactive**: < 3s

## Best Practices

1. **Cache Aggressively, Invalidate Precisely**:
   - Cache read-heavy operations
   - Use specific tags for targeted invalidation
   - Set appropriate TTLs based on data volatility

2. **Optimize Database Access**:
   - Use indexed fields in queries
   - Batch operations when possible
   - Limit returned fields with select
   - Use pagination for large datasets

3. **Minimize Re-renders**:
   - Use React.memo for pure components
   - Memoize callbacks and expensive computations
   - Use virtual scrolling for long lists
   - Implement code splitting for large bundles

4. **Monitor Performance**:
   - Track cache hit rates
   - Log slow database queries
   - Monitor bundle sizes
   - Use React DevTools Profiler

## Troubleshooting

### Cache Not Working

Check cache configuration and ensure tags are correct:
```typescript
const stats = cacheManager.getStats();
console.log('Cache stats:', stats);
```

### Slow Queries

Analyze query execution:
```typescript
// Check if indexes are being used
const explain = await prisma.$queryRaw`EXPLAIN QUERY PLAN ${query}`;
```

### High Memory Usage

Monitor cache size and clear if needed:
```typescript
// Clear specific tag
await cacheManager.invalidateByTag(tag);

// Clear all cache
await cacheManager.clear();
```

## Further Optimizations

Future improvements to consider:

1. **Redis Cache**: Replace in-memory cache with Redis for multi-instance deployments
2. **CDN Integration**: Cache static assets and API responses at edge locations
3. **Database Read Replicas**: Distribute read load across multiple database instances
4. **Service Workers**: Implement offline-first architecture with background sync
5. **HTTP/2 Server Push**: Push critical resources before they're requested
