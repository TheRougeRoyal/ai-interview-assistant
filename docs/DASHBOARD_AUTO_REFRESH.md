# Interviewer Dashboard Auto-Refresh Implementation

## Problem
The interviewer dashboard was not dynamically updating when candidates completed their interviews. This was because:

1. **Event Emitter Limitation**: The in-memory `emitter` instance is isolated per execution context (client vs server, different tabs)
2. **SSE Not Working Across Tabs**: Server-Sent Events use the same emitter instance which doesn't bridge server/client boundaries
3. **No Polling Mechanism**: The dashboard only refreshed on manual user interaction or the 30-second interval in the old component

## Solution
Implemented a robust multi-layer refresh strategy:

### 1. **Automatic Polling (10 seconds)**
- Polls the `/api/candidates` endpoint every 10 seconds
- Only runs when the page is visible (using `document.visibilityState`)
- Silent refresh - doesn't show loading state to avoid UI flicker
- Compares candidate IDs to detect actual changes before updating state
- Shows notification when new candidates are detected

```typescript
// Auto-refresh every 10 seconds when the page is visible
useEffect(() => {
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      // Silently refetch without setting loading state
      fetchQuietly()
    }
  }, 10000) // Poll every 10 seconds

  return () => clearInterval(interval)
}, [debouncedSearch, sortField, sortOrder, candidates])
```

### 2. **Visibility Change Detection**
- Automatically refreshes when user switches back to the dashboard tab
- Includes a 5-second cooldown to prevent unnecessary requests
- Provides fresh data when returning to the page

```typescript
// Refresh when tab becomes visible
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const timeSinceLastFetch = Date.now() - lastFetchTime
      // Only refresh if more than 5 seconds have passed
      if (timeSinceLastFetch > 5000) {
        fetchAgain()
      }
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [debouncedSearch, sortField, sortOrder, lastFetchTime])
```

### 3. **Visual Notifications**
- Shows a green notification banner when new candidates complete interviews
- Auto-dismisses after 5 seconds
- Uses Lucide's `CheckCircle2` icon for visual feedback
- Fixed positioning in top-right corner with smooth animation

```typescript
if (newCandidates.length > 0) {
  setNotification(`${newCandidates.length} new candidate(s) completed their interview!`)
  setTimeout(() => setNotification(null), 5000)
}
```

## Benefits

### ✅ Real-time Updates
- Dashboard updates within 10 seconds of interview completion
- No need to manually refresh the page

### ✅ Resource Efficient
- Only polls when page is visible
- Intelligent change detection prevents unnecessary re-renders
- Cooldown period prevents excessive API calls

### ✅ Better UX
- Visual notification provides immediate feedback
- Smooth updates without jarring loading states
- Works across different tabs and windows

### ✅ Resilient
- Multiple fallback mechanisms ensure data stays fresh
- Handles network errors gracefully
- Maintains state consistency

## Testing the Feature

### Manual Test
1. Open the interviewer dashboard in one browser tab/window
2. Complete an interview as a candidate in another tab/window
3. Within 10 seconds, the interviewer dashboard should:
   - Update the candidate list
   - Show a green notification banner
   - Update statistics (total candidates, completed count, avg score)

### Edge Cases Handled
- ✅ Page not visible (no polling)
- ✅ Network errors (graceful degradation)
- ✅ Multiple rapid changes (efficient batching)
- ✅ Tab switching (immediate refresh with cooldown)
- ✅ Different sort/filter states (respects current view)

## Configuration

### Polling Interval
Currently set to 10 seconds. Can be adjusted in the code:
```typescript
}, 10000) // Poll every 10 seconds
```

### Visibility Cooldown
Currently set to 5 seconds. Can be adjusted:
```typescript
if (timeSinceLastFetch > 5000) {
```

### Notification Duration
Currently set to 5 seconds. Can be adjusted:
```typescript
setTimeout(() => setNotification(null), 5000)
```

## Future Enhancements

### Potential Improvements
1. **WebSocket Support**: Replace polling with bidirectional WebSocket connection
2. **Configurable Intervals**: Allow users to set refresh frequency
3. **Smart Polling**: Increase polling frequency when interviews are active
4. **Browser Notifications**: Use Web Notifications API for desktop alerts
5. **Sound Alerts**: Optional sound notification for new completions
6. **Activity Indicator**: Show "Live" badge when actively polling

### WebSocket Implementation (Future)
```typescript
// Example WebSocket approach
const ws = new WebSocket('ws://localhost:3000/api/live')
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.event === 'candidate:completed') {
    // Instant update without polling
    refetchCandidates()
  }
}
```

## Files Modified
- `/app/(interview)/interviewer/page.tsx` - Main dashboard component
  - Added polling mechanism
  - Added visibility change detection
  - Added notification state and UI
  - Added lastFetchTime tracking

## Dependencies
- No new dependencies added
- Uses existing `fetchAPI` client
- Uses existing shadcn/ui components
- Uses Lucide icons (already installed)

## Performance Impact
- **Network**: ~1 request per 10 seconds (when visible)
- **Memory**: Minimal - single interval and event listener
- **CPU**: Negligible - only processes on data change
- **Bundle Size**: No change (no new dependencies)
