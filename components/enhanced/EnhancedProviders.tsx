/**
 * Enhanced Providers with error boundaries, offline support, and comprehensive error handling
 */

"use client"

import React, { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import type { Persistor } from 'redux-persist'

// Store imports
import { store, getPersistor } from '@/store'
import { 
  enhancedStore, 
  getEnhancedPersistor, 
  initializeEnhancedStore 
} from '@/store/enhanced'

// Component imports
import AuthProvider from '@/components/auth/AuthProvider'
import { 
  PageErrorBoundary, 
  AsyncErrorBoundary 
} from '@/components/ui/error-boundary'
import { 
  PageLoading 
} from '@/components/ui/loading-states'
import { 
  OfflineIndicator, 
  useOnlineStatus,
  useOfflineQueue 
} from '@/components/ui/offline-state'
import { Toaster } from '@/components/ui/toaster'

// Utilities
import { getApiLogger } from '@/lib/logging'
import { generateCorrelationId } from '@/lib/errors/correlation'

/**
 * Enhanced providers configuration
 */
interface EnhancedProvidersProps {
  children: React.ReactNode
  useEnhancedStore?: boolean
  enableOfflineSupport?: boolean
  enableErrorTracking?: boolean
  showOfflineIndicator?: boolean
}

/**
 * Store initialization component
 */
function StoreProvider({ 
  children, 
  useEnhancedStore = false 
}: { 
  children: React.ReactNode
  useEnhancedStore?: boolean 
}) {
  const [persistor, setPersistor] = useState<Persistor | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<Error | null>(null)
  const logger = getApiLogger()

  useEffect(() => {
    const initializeStore = async () => {
      const correlationId = generateCorrelationId()
      
      try {
        logger.info('Initializing store', {
          useEnhancedStore,
          correlationId
        })

        if (useEnhancedStore) {
          const { persistor: enhancedPersistor } = await initializeEnhancedStore()
          setPersistor(enhancedPersistor)
        } else {
          const legacyPersistor = getPersistor()
          setPersistor(legacyPersistor)
        }

        setIsInitialized(true)
        
        logger.info('Store initialized successfully', {
          useEnhancedStore,
          correlationId
        })
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Store initialization failed')
        setInitError(err)
        
        logger.error('Store initialization failed', err, {
          useEnhancedStore,
          correlationId
        })
      }
    }

    initializeStore()
  }, [useEnhancedStore, logger])

  if (initError) {
    throw initError
  }

  if (!isInitialized) {
    return (
      <PageLoading 
        message="Initializing application..."
        showProgress={false}
      />
    )
  }

  const storeInstance = useEnhancedStore ? enhancedStore : store

  return (
    <Provider store={storeInstance}>
      {persistor ? (
        <PersistGate 
          loading={
            <PageLoading 
              message="Restoring your session..."
              showProgress={false}
            />
          } 
          persistor={persistor}
        >
          {children}
        </PersistGate>
      ) : (
        children
      )}
    </Provider>
  )
}

/**
 * Offline support provider
 */
function OfflineProvider({ 
  children, 
  enabled = true 
}: { 
  children: React.ReactNode
  enabled?: boolean 
}) {
  const isOnline = useOnlineStatus()
  const { processQueue } = useOfflineQueue()
  const logger = getApiLogger()

  // Process offline queue when coming back online
  useEffect(() => {
    if (isOnline && enabled) {
      logger.info('Connection restored, processing offline queue')
      
      processQueue(async (action) => {
        try {
          // This would be handled by specific components
          // that register their own queue processors
          logger.debug('Processing queued action', {
            type: action.type,
            id: action.id
          })
          return true
        } catch (error) {
          logger.error('Failed to process queued action', error, {
            actionId: action.id,
            actionType: action.type
          })
          return false
        }
      })
    }
  }, [isOnline, enabled, processQueue, logger])

  return <>{children}</>
}

/**
 * Error tracking provider
 */
function ErrorTrackingProvider({ 
  children, 
  enabled = true 
}: { 
  children: React.ReactNode
  enabled?: boolean 
}) {
  const logger = getApiLogger()

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // Global error handler
    const handleError = (event: ErrorEvent) => {
      logger.error('Global JavaScript error', new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    }

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
      
      logger.error('Unhandled promise rejection', error)
    }

    // Resource loading error handler
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement
      if (target) {
        logger.error('Resource loading error', new Error('Resource failed to load'), {
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
          id: target.id,
          className: target.className
        })
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleResourceError, true) // Capture phase

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleResourceError, true)
    }
  }, [enabled, logger])

  return <>{children}</>
}

/**
 * Performance monitoring provider
 */
function PerformanceProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const logger = getApiLogger()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Tasks longer than 50ms
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              })
            }
          }
        })

        longTaskObserver.observe({ entryTypes: ['longtask'] })

        // Monitor layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).value > 0.1) { // CLS threshold
              logger.warn('Layout shift detected', {
                value: (entry as any).value,
                startTime: entry.startTime
              })
            }
          }
        })

        clsObserver.observe({ entryTypes: ['layout-shift'] })

        return () => {
          longTaskObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (error) {
        logger.warn('Performance monitoring setup failed', error)
      }
    }

    // Monitor memory usage
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        const totalMB = memory.totalJSHeapSize / 1024 / 1024
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024

        if (usedMB > limitMB * 0.8) { // 80% of limit
          logger.warn('High memory usage detected', {
            usedMB: Math.round(usedMB),
            totalMB: Math.round(totalMB),
            limitMB: Math.round(limitMB),
            percentage: Math.round((usedMB / limitMB) * 100)
          })
        }
      }
    }

    const memoryInterval = setInterval(checkMemory, 30000) // Check every 30 seconds

    return () => {
      clearInterval(memoryInterval)
    }
  }, [logger])

  return <>{children}</>
}

/**
 * Main enhanced providers component
 */
export default function EnhancedProviders({
  children,
  useEnhancedStore = false,
  enableOfflineSupport = true,
  enableErrorTracking = true,
  showOfflineIndicator = true
}: EnhancedProvidersProps) {
  return (
    <PageErrorBoundary
      onError={(error, errorInfo, errorId) => {
        console.error('Application-level error:', error)
        
        // Report to external error tracking
        if (typeof window !== 'undefined' && window.Sentry) {
          window.Sentry.withScope((scope) => {
            scope.setTag('errorBoundary', 'EnhancedProviders')
            scope.setTag('errorId', errorId)
            scope.setLevel('fatal')
            scope.setContext('errorInfo', {
              componentStack: errorInfo.componentStack
            })
            window.Sentry.captureException(error)
          })
        }
      }}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <AsyncErrorBoundary
        onAsyncError={(error) => {
          console.error('Async error in providers:', error)
        }}
      >
        <ErrorTrackingProvider enabled={enableErrorTracking}>
          <PerformanceProvider>
            <StoreProvider useEnhancedStore={useEnhancedStore}>
              <OfflineProvider enabled={enableOfflineSupport}>
                <AuthProvider>
                  {children}
                  
                  {/* Global UI components */}
                  <Toaster />
                  
                  {showOfflineIndicator && (
                    <OfflineIndicator />
                  )}
                </AuthProvider>
              </OfflineProvider>
            </StoreProvider>
          </PerformanceProvider>
        </ErrorTrackingProvider>
      </AsyncErrorBoundary>
    </PageErrorBoundary>
  )
}

/**
 * Hook for accessing enhanced provider context
 */
export function useEnhancedProviders() {
  const isOnline = useOnlineStatus()
  const { queue, queueSize } = useOfflineQueue()
  
  return {
    isOnline,
    offlineQueue: queue,
    offlineQueueSize: queueSize
  }
}

/**
 * Development-only provider wrapper
 */
export function DevProviders({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>
  }

  return (
    <EnhancedProviders
      useEnhancedStore={true}
      enableOfflineSupport={true}
      enableErrorTracking={true}
      showOfflineIndicator={true}
    >
      {children}
    </EnhancedProviders>
  )
}

/**
 * Production-optimized provider wrapper
 */
export function ProductionProviders({ children }: { children: React.ReactNode }) {
  return (
    <EnhancedProviders
      useEnhancedStore={true}
      enableOfflineSupport={true}
      enableErrorTracking={true}
      showOfflineIndicator={false} // Less intrusive in production
    >
      {children}
    </EnhancedProviders>
  )
}