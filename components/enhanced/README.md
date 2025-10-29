# Enhanced UI Components

A comprehensive set of React components with built-in error boundaries, loading states, and offline support for robust user experiences.

## Features

- **🛡️ Error Boundaries**: Graceful error handling at page, section, and component levels
- **⏳ Loading States**: Consistent loading UX with skeletons, spinners, and progress indicators
- **📱 Offline Support**: Intelligent offline detection and queue management
- **🔄 Auto-Recovery**: Automatic retry mechanisms and error recovery
- **📊 Performance Monitoring**: Built-in performance tracking and optimization
- **🎯 Accessibility**: WCAG compliant components with keyboard navigation
- **🎨 Consistent Design**: Unified design system with Tailwind CSS

## Components Overview

### Error Boundaries

#### `ErrorBoundary`
Base error boundary component with customizable fallback UI and error reporting.

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary'

<ErrorBoundary
  level="component"
  onError={(error, errorInfo, errorId) => {
    console.error('Component error:', error)
  }}
  maxRetries={3}
  showDetails={true}
>
  <YourComponent />
</ErrorBoundary>
```

#### Specialized Error Boundaries

```tsx
import { 
  PageErrorBoundary, 
  SectionErrorBoundary, 
  ComponentErrorBoundary 
} from '@/components/ui/error-boundary'

// Page-level error boundary
<PageErrorBoundary>
  <YourPage />
</PageErrorBoundary>

// Section-level error boundary
<SectionErrorBoundary>
  <YourSection />
</SectionErrorBoundary>

// Component-level error boundary
<ComponentErrorBoundary>
  <YourComponent />
</ComponentErrorBoundary>
```

#### Error Boundary HOC

```tsx
import { withErrorBoundary } from '@/components/ui/error-boundary'

const SafeComponent = withErrorBoundary(YourComponent, {
  maxRetries: 2,
  onError: (error) => console.error(error)
})
```

### Loading States

#### `LoadingSpinner`
Customizable loading spinner with different sizes and colors.

```tsx
import { LoadingSpinner } from '@/components/ui/loading-states'

<LoadingSpinner size="lg" color="primary" />
```

#### `LoadingOverlay`
Overlay loading state for wrapping content.

```tsx
import { LoadingOverlay } from '@/components/ui/loading-states'

<LoadingOverlay isLoading={isLoading} message="Processing...">
  <YourContent />
</LoadingOverlay>
```

#### Skeleton Components

```tsx
import { 
  Skeleton, 
  CardSkeleton, 
  TableSkeleton, 
  ListSkeleton 
} from '@/components/ui/loading-states'

// Basic skeleton
<Skeleton className="h-4 w-full" />

// Pre-built skeletons
<CardSkeleton />
<TableSkeleton rows={5} columns={4} />
<ListSkeleton items={3} showAvatar={true} />
```

#### Progress Loading

```tsx
import { ProgressLoading } from '@/components/ui/loading-states'

<ProgressLoading 
  progress={75} 
  message="Uploading file..." 
  showPercentage={true} 
/>
```

#### Specialized Loading States

```tsx
import { 
  FileUploadLoading, 
  SearchLoading, 
  ProcessingLoading,
  InfiniteLoading 
} from '@/components/ui/loading-states'

<FileUploadLoading progress={50} fileName="resume.pdf" />
<SearchLoading query="john doe" />
<ProcessingLoading operation="Analyzing resume" />
<InfiniteLoading 
  hasMore={true} 
  isLoading={false} 
  onLoadMore={() => loadMore()} 
/>
```

### Offline Support

#### `useOnlineStatus`
Hook for detecting online/offline state.

```tsx
import { useOnlineStatus } from '@/components/ui/offline-state'

function MyComponent() {
  const isOnline = useOnlineStatus()
  
  return (
    <div>
      Status: {isOnline ? 'Online' : 'Offline'}
    </div>
  )
}
```

#### `OfflineIndicator`
Visual indicator for connection status.

```tsx
import { OfflineIndicator } from '@/components/ui/offline-state'

<OfflineIndicator showWhenOnline={false} />
```

#### `OfflineAware`
Component wrapper that handles offline states.

```tsx
import { OfflineAware } from '@/components/ui/offline-state'

<OfflineAware
  fallback={<div>This feature requires internet connection</div>}
  showOfflineMessage={true}
>
  <OnlineOnlyComponent />
</OfflineAware>
```

#### `useOfflineQueue`
Hook for managing offline action queues.

```tsx
import { useOfflineQueue } from '@/components/ui/offline-state'

function MyComponent() {
  const { addToQueue, processQueue, queueSize } = useOfflineQueue()
  
  const handleAction = async (data) => {
    if (!navigator.onLine) {
      addToQueue('create-candidate', data)
      return
    }
    
    // Process normally
    await createCandidate(data)
  }
  
  return <div>Queued actions: {queueSize}</div>
}
```

### Enhanced Components

#### `EnhancedResumeUploader`
Resume uploader with error boundaries, progress tracking, and offline support.

```tsx
import EnhancedResumeUploader from '@/components/enhanced/EnhancedResumeUploader'

<EnhancedResumeUploader
  onParsed={(data) => console.log('Parsed:', data)}
  onError={(error) => console.error('Error:', error)}
  maxRetries={3}
  enableOfflineQueue={true}
/>
```

#### `EnhancedProviders`
Application providers with comprehensive error handling and offline support.

```tsx
import EnhancedProviders from '@/components/enhanced/EnhancedProviders'

<EnhancedProviders
  useEnhancedStore={true}
  enableOfflineSupport={true}
  enableErrorTracking={true}
  showOfflineIndicator={true}
>
  <App />
</EnhancedProviders>
```

#### `EnhancedDashboard`
Dashboard component with error boundaries and loading states.

```tsx
import EnhancedDashboard from '@/components/enhanced/EnhancedDashboard'

<EnhancedDashboard />
```

## Hooks

### Loading Hooks

```tsx
import { useLoading, useProgress } from '@/components/ui/loading-states'

function MyComponent() {
  const { isLoading, startLoading, stopLoading, withLoading } = useLoading()
  const { progress, setProgress, incrementProgress, resetProgress } = useProgress()
  
  const handleAsyncOperation = async () => {
    await withLoading(async () => {
      // Your async operation
      setProgress(50)
      await someOperation()
      setProgress(100)
    })
  }
}
```

### Error Handling Hooks

```tsx
import { useErrorHandler } from '@/components/ui/error-boundary'

function MyComponent() {
  const { handleError, resetError } = useErrorHandler()
  
  const riskyOperation = async () => {
    try {
      await someRiskyOperation()
    } catch (error) {
      handleError(error) // This will trigger the error boundary
    }
  }
}
```

### Offline Hooks

```tsx
import { 
  useOfflineStorage, 
  useOfflineQueue 
} from '@/components/ui/offline-state'

function MyComponent() {
  const [data, setData, clearData] = useOfflineStorage('myData', [])
  const { addToQueue, processQueue } = useOfflineQueue()
  
  // Data persists offline
  const updateData = (newData) => {
    setData(newData)
  }
}
```

## Best Practices

### 1. Error Boundary Placement

```tsx
// ✅ Good - Granular error boundaries
<PageErrorBoundary>
  <Header />
  <SectionErrorBoundary>
    <MainContent />
  </SectionErrorBoundary>
  <SectionErrorBoundary>
    <Sidebar />
  </SectionErrorBoundary>
</PageErrorBoundary>

// ❌ Avoid - Single error boundary for everything
<ErrorBoundary>
  <EntireApp />
</ErrorBoundary>
```

### 2. Loading State Management

```tsx
// ✅ Good - Specific loading states
<LoadingOverlay isLoading={isUploading} message="Uploading file...">
  <FileUploader />
</LoadingOverlay>

// ✅ Good - Skeleton for content loading
{isLoading ? <CardSkeleton /> : <Card>{content}</Card>}

// ❌ Avoid - Generic loading for everything
{isLoading && <div>Loading...</div>}
```

### 3. Offline Support

```tsx
// ✅ Good - Graceful offline handling
<OfflineAware
  fallback={<OfflineMessage />}
>
  <OnlineFeature />
</OfflineAware>

// ✅ Good - Queue offline actions
const handleSubmit = async (data) => {
  if (!isOnline) {
    addToQueue('submit-form', data)
    showToast('Queued for when online')
    return
  }
  
  await submitForm(data)
}
```

### 4. Error Recovery

```tsx
// ✅ Good - Provide retry mechanisms
<ErrorBoundary
  maxRetries={3}
  onError={(error, errorInfo, errorId) => {
    logError(error, { errorId, context: 'UserProfile' })
  }}
>
  <UserProfile />
</ErrorBoundary>
```

## Styling and Theming

All components use Tailwind CSS classes and support dark mode through CSS variables:

```css
/* Custom error boundary styles */
.error-boundary--isolated {
  isolation: isolate;
}

/* Loading state animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Logical focus flow
- **Color Contrast**: Meets contrast requirements
- **Error Announcements**: Screen reader friendly error messages

```tsx
// Error boundaries announce errors to screen readers
<ErrorBoundary>
  <div role="alert" aria-live="assertive">
    Error occurred: {error.message}
  </div>
</ErrorBoundary>

// Loading states provide proper feedback
<div role="status" aria-live="polite">
  <LoadingSpinner />
  <span className="sr-only">Loading content...</span>
</div>
```

## Performance Considerations

### 1. Component Memoization

```tsx
import React from 'react'

const OptimizedComponent = React.memo(({ data }) => {
  return <ExpensiveComponent data={data} />
})
```

### 2. Lazy Loading

```tsx
const LazyComponent = React.lazy(() => import('./HeavyComponent'))

<React.Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</React.Suspense>
```

### 3. Error Boundary Optimization

```tsx
// Isolate error boundaries to prevent cascade failures
<ComponentErrorBoundary isolate={true}>
  <IndependentComponent />
</ComponentErrorBoundary>
```

## Testing

### Testing Error Boundaries

```tsx
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

test('error boundary catches errors', () => {
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  )
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})
```

### Testing Loading States

```tsx
test('shows loading spinner when loading', () => {
  render(<LoadingSpinner />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

### Testing Offline Support

```tsx
test('shows offline message when offline', () => {
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false
  })
  
  render(<OfflineIndicator />)
  expect(screen.getByText(/offline/i)).toBeInTheDocument()
})
```

## Migration Guide

### From Basic Components

1. **Wrap with Error Boundaries**:
   ```tsx
   // Before
   <MyComponent />
   
   // After
   <ComponentErrorBoundary>
     <MyComponent />
   </ComponentErrorBoundary>
   ```

2. **Add Loading States**:
   ```tsx
   // Before
   {isLoading && <div>Loading...</div>}
   
   // After
   <LoadingOverlay isLoading={isLoading}>
     <MyComponent />
   </LoadingOverlay>
   ```

3. **Handle Offline States**:
   ```tsx
   // Before
   <OnlineOnlyFeature />
   
   // After
   <OfflineAware>
     <OnlineOnlyFeature />
   </OfflineAware>
   ```

## Contributing

When adding new enhanced components:

1. Include error boundaries at appropriate levels
2. Implement loading states for async operations
3. Add offline support where applicable
4. Follow accessibility guidelines
5. Include comprehensive tests
6. Document usage patterns and examples