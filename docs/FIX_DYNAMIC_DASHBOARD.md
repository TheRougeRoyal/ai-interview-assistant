# Fix: Interviewer Dashboard Dynamic Rendering

## Problem
The interviewer dashboard was not dynamically updating with new candidate data. It appeared to be statically cached, showing stale data even when new candidates completed their interviews.

## Root Cause
In Next.js 15, even client components (`'use client'`) can be statically rendered at build time by default for improved performance. However, this causes issues for pages that need to display real-time data that changes frequently.

The interviewer dashboard and its related API routes were being statically rendered, causing:
1. Stale candidate lists on page load
2. No updates when new candidates completed interviews
3. Cached API responses instead of fresh data

## Solution
Added explicit dynamic rendering configuration to force Next.js to always render these pages and API routes dynamically:

### 1. Interviewer Dashboard Page
**File:** `app/(interview)/interviewer/page.tsx`

Added configuration export:
```typescript
export const dynamic = 'force-dynamic'
```

This ensures:
- Page is never statically cached
- Always server-rendered with fresh data
- Real-time updates are possible

**Note:** We use only `dynamic = 'force-dynamic'` without `revalidate` because `revalidate` is a reserved client-side function in Next.js and causes conflicts when exported from client components.

### 2. API Routes
Added the same configuration to all candidate and session-related API routes:

- `app/api/candidates/route.ts` - Candidate list endpoint
- `app/api/candidates/[id]/route.ts` - Single candidate endpoint
- `app/api/candidates/[id]/full/route.ts` - Full candidate details with sessions
- `app/api/sessions/route.ts` - Session creation endpoint
- `app/api/sessions/[id]/route.ts` - Session details endpoint

This ensures:
- API responses are never cached
- Fresh data is always returned from the database
- Changes are immediately visible to all clients

## Technical Details

### Next.js 15 Rendering Behavior
- **Static Rendering (default):** Pages/routes are pre-rendered at build time
- **Dynamic Rendering (forced):** Pages/routes are rendered on each request
- **Revalidation:** Set to 0 to disable any time-based caching

### Configuration Options
```typescript
export const dynamic = 'force-dynamic'  // Force dynamic rendering
```

**Important:** Do not use `export const revalidate = 0` in client components or API routes as it conflicts with Next.js's client-side `revalidate()` function. Using `dynamic = 'force-dynamic'` alone is sufficient to disable caching.

### Auto-Refresh Features
The dashboard already had auto-refresh features in place:
- 5-second polling interval for new data
- Visibility change detection (refresh when tab becomes visible)
- Manual refresh capability

These features now work correctly with dynamic rendering enabled.

## Testing
After this fix, you should observe:
1. ✅ Fresh candidate data on every page load
2. ✅ Auto-refresh detecting new candidates every 5 seconds
3. ✅ Notifications when new candidates complete interviews
4. ✅ No stale cached data

## Impact
- **Performance:** Minimal impact - the dashboard was already fetching fresh data client-side every 5 seconds
- **User Experience:** Significant improvement - users now see real-time data immediately
- **Scalability:** No issues - dynamic rendering is standard for admin dashboards

## Related Files
- `app/(interview)/interviewer/page.tsx`
- `app/api/candidates/route.ts`
- `app/api/candidates/[id]/route.ts`
- `app/api/candidates/[id]/full/route.ts`
- `app/api/sessions/route.ts`
- `app/api/sessions/[id]/route.ts`

## References
- [Next.js 15 Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)
- [Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
