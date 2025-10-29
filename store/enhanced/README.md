# Enhanced Redux Store with Normalized State

This enhanced Redux store implementation provides a robust, scalable state management solution with normalized entities, optimistic updates, comprehensive error handling, and seamless integration with the existing legacy state.

## Features

- **Normalized State Structure**: Efficient entity management with denormalized selectors
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **Comprehensive Error Handling**: Centralized error management with correlation IDs
- **State Persistence**: Intelligent persistence with error recovery and migrations
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Legacy Integration**: Seamless integration with existing Redux slices
- **Type Safety**: Full TypeScript support with strict typing

## Architecture Overview

```
Enhanced Store
├── Entities (Normalized)
│   ├── Candidates
│   ├── Sessions
│   ├── Answers
│   ├── Users
│   └── Scores
├── Collections (Ordered IDs)
├── Loading States
├── Error States
├── UI State
├── Cache Metadata
├── Optimistic Updates
└── Legacy State (Backward Compatibility)
```

## Quick Start

### 1. Initialize the Enhanced Store

```typescript
import { EnhancedStoreSetup } from '@/store/enhanced'

// Initialize store with error handling
const { store, persistor } = await EnhancedStoreSetup.initialize()
```

### 2. Use Enhanced Hooks in Components

```typescript
import { useCandidates, useCurrentCandidate } from '@/store/enhanced'

function CandidateList() {
  const {
    candidates,
    filteredCandidates,
    loading,
    error,
    stats,
    actions
  } = useCandidates()
  
  const { currentCandidate, setCurrent } = useCurrentCandidate()

  // Load candidates
  useEffect(() => {
    actions.fetchList({ page: 1, limit: 20 })
  }, [])

  // Create new candidate
  const handleCreate = async () => {
    const candidate = await actions.create({
      name: 'John Doe',
      email: 'john@example.com'
    })
    setCurrent(candidate.id)
  }

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      
      <div>Total: {stats.total}</div>
      
      {filteredCandidates.map(candidate => (
        <div key={candidate.id} onClick={() => setCurrent(candidate.id)}>
          {candidate.name} - {candidate.email}
        </div>
      ))}
      
      <button onClick={handleCreate}>Add Candidate</button>
    </div>
  )
}
```

### 3. Use Selectors for Data Access

```typescript
import { useEnhancedSelector, selectCandidateWithSessions } from '@/store/enhanced'

function CandidateDetail({ candidateId }: { candidateId: string }) {
  const candidateWithSessions = useEnhancedSelector(
    selectCandidateWithSessions(candidateId)
  )

  if (!candidateWithSessions) return <div>Candidate not found</div>

  return (
    <div>
      <h2>{candidateWithSessions.name}</h2>
      <p>Sessions: {candidateWithSessions.sessions.length}</p>
      
      {candidateWithSessions.sessions.map(session => (
        <div key={session.id}>
          Stage: {session.stage} - Index: {session.currentIndex}
        </div>
      ))}
    </div>
  )
}
```

## State Structure

### Normalized Entities

```typescript
interface NormalizedEntities {
  candidates: Record<string, CandidateEntity>
  sessions: Record<string, SessionEntity>
  answers: Record<string, AnswerEntity>
  users: Record<string, UserEntity>
  scores: Record<string, ScoreEntity>
}
```

### Entity Collections (Ordered Lists)

```typescript
interface EntityCollections {
  candidateIds: string[]
  sessionIds: string[]
  answerIds: string[]
  userIds: string[]
  scoreIds: string[]
}
```

### Loading and Error States

```typescript
interface LoadingStates {
  candidates: {
    list: boolean
    create: boolean
    update: boolean
    delete: boolean
    search: boolean
  }
  // ... other entities
}

interface ErrorStates {
  candidates: {
    list: ApiError | null
    create: ApiError | null
    // ... other operations
  }
  // ... other entities
  global: ApiError | null
}
```

## Key Concepts

### 1. Normalized State Benefits

- **Consistency**: Single source of truth for each entity
- **Performance**: Efficient updates and lookups
- **Relationships**: Easy management of entity relationships
- **Scalability**: Handles large datasets efficiently

### 2. Optimistic Updates

```typescript
// Automatic optimistic updates
const { optimisticUpdate } = useOptimisticUpdates('candidates', updateCandidateAPI)

const handleUpdate = async (id: string, updates: Partial<CandidateEntity>) => {
  await optimisticUpdate(id, updates, {
    // Optimistic data shown immediately
    ...currentCandidate,
    ...updates,
    updatedAt: new Date().toISOString()
  })
}
```

### 3. Error Handling with Correlation IDs

```typescript
// Errors are automatically tracked with correlation IDs
const { handleAsyncError } = useErrorHandler()

const safeOperation = handleAsyncError(
  () => actions.create(candidateData),
  'Creating candidate'
)
```

### 4. Intelligent Caching

```typescript
const { isCached, isStale } = useCache()

// Check if data needs refreshing
if (!isCached('candidates-list') || isStale('candidates-list')) {
  actions.fetchList()
}
```

## Advanced Usage

### Custom Selectors

```typescript
import { createSelector } from '@reduxjs/toolkit'
import { selectCandidates, selectSessions } from '@/store/enhanced'

const selectCandidatesWithActiveSessions = createSelector(
  [selectCandidates, selectSessions],
  (candidates, sessions) => {
    return Object.values(candidates).filter(candidate =>
      candidate.sessionIds.some(sessionId => 
        sessions[sessionId]?.stage === 'interviewing'
      )
    )
  }
)
```

### Batch Operations

```typescript
import { batchUpdateEntities } from '@/store/enhanced'

// Update multiple entities efficiently
dispatch(batchUpdateEntities({
  candidates: {
    'candidate-1': { finalScore: 85 },
    'candidate-2': { finalScore: 92 }
  },
  sessions: {
    'session-1': { stage: 'completed' }
  }
}))
```

### Performance Monitoring

```typescript
function MyComponent() {
  const { measureOperation } = usePerformanceMonitor('MyComponent')

  const handleExpensiveOperation = () => {
    measureOperation('expensiveOperation', () => {
      // Your expensive operation here
    })
  }
}
```

## Migration from Legacy State

The enhanced store maintains backward compatibility with existing Redux slices:

```typescript
// Legacy state is still accessible
const legacyAuth = useEnhancedSelector(state => state.legacy.auth)
const legacySession = useEnhancedSelector(state => state.legacy.session)

// Auto-sync legacy state with normalized state
const { syncNow } = useAutoSync()
useEffect(() => {
  syncNow() // Sync legacy session data to normalized state
}, [])
```

## API Integration

### Enhanced API Client

```typescript
import { apiClient } from '@/store/enhanced'

// Automatic retry, error handling, and correlation IDs
const response = await apiClient.post('/api/candidates', candidateData, {
  retries: 3,
  timeout: 10000,
  optimistic: true
})
```

### Optimistic API Calls

```typescript
// Return optimistic data immediately, make real call in background
const response = await apiClient.optimisticRequest('/api/candidates', {
  method: 'POST',
  body: candidateData,
  optimisticData: { ...candidateData, id: 'temp-id' },
  rollbackFn: () => {
    // Rollback UI changes if API call fails
    dispatch(removeCandidate('temp-id'))
  }
})
```

## Testing

### Mock Enhanced Store

```typescript
import { createMockEnhancedStore } from '@/store/enhanced/testing'

const mockStore = createMockEnhancedStore({
  entities: {
    candidates: {
      'test-id': {
        id: 'test-id',
        name: 'Test Candidate',
        email: 'test@example.com'
      }
    }
  }
})
```

### Test Selectors

```typescript
import { selectCandidateList } from '@/store/enhanced'

test('selectCandidateList returns candidates in order', () => {
  const state = {
    entities: { candidates: mockCandidates },
    collections: { candidateIds: ['1', '2', '3'] }
  }
  
  const result = selectCandidateList(state)
  expect(result).toHaveLength(3)
  expect(result[0].id).toBe('1')
})
```

## Performance Best Practices

1. **Use Memoized Selectors**: Always use `createSelector` for derived data
2. **Batch Updates**: Use `batchUpdateEntities` for multiple updates
3. **Lazy Loading**: Load data only when needed
4. **Cache Management**: Monitor cache hit rates and cleanup stale entries
5. **Optimistic Updates**: Use for better perceived performance

## Debugging

### Development Tools

```typescript
import { EnhancedStoreDev } from '@/store/enhanced'

// Available in development mode only
EnhancedStoreDev.logState()
EnhancedStoreDev.logHealth()
EnhancedStoreDev.simulateError('Test error')
```

### Store Health Monitoring

```typescript
import { EnhancedStoreSetup } from '@/store/enhanced'

const health = EnhancedStoreSetup.getHealth()
console.log('Store Health:', health)
// {
//   storeInitialized: true,
//   persistorInitialized: true,
//   entitiesCount: { candidates: 5, sessions: 3, ... },
//   optimisticUpdatesCount: 0,
//   cacheEntriesCount: 12,
//   hasErrors: false
// }
```

## Error Recovery

The enhanced store includes comprehensive error recovery:

- **Automatic Retry**: Failed API calls are retried with exponential backoff
- **Optimistic Rollback**: Failed optimistic updates are automatically reverted
- **State Validation**: Persisted state is validated before loading
- **Graceful Degradation**: Components continue working even with partial failures

## Contributing

When adding new entities or features:

1. Define entity types in `types.ts`
2. Add entity slice in `entities.ts`
3. Create selectors in `selectors.ts`
4. Add integration thunks in `integration.ts`
5. Create hooks in `hooks.ts`
6. Update exports in `index.ts`

## Examples

See the `examples/` directory for complete component examples:

- `CandidateList.example.tsx` - Full CRUD operations with normalized state
- `SessionManager.example.tsx` - Complex state relationships
- `OptimisticUpdates.example.tsx` - Optimistic update patterns