/**
 * Offline state management components with error boundaries
 */

"use client"

import React from 'react'
import { WifiOff, Wifi, AlertTriangle, RefreshCw, Clock } from 'lucide-react'
import { ComponentErrorBoundary } from './error-boundary'
import { getApiLogger } from '@/lib/logging'

/**
 * Hook for detecting online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Offline queue management hook
 */
interface QueuedAction {
  id: string
  type: string
  data: any
  timestamp: number
  retryCount?: number
  maxRetries?: number
}

export function useOfflineQueue() {
  const [queue, setQueue] = React.useState<QueuedAction[]>([])
  const logger = getApiLogger()

  const addToQueue = React.useCallback((action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: action.maxRetries || 3
    }

    setQueue(prev => [...prev, queuedAction])
    
    logger.info('Action queued for offline processing', {
      actionId: queuedAction.id,
      actionType: queuedAction.type
    })

    return queuedAction.id
  }, [logger])

  const removeFromQueue = React.useCallback((actionId: string) => {
    setQueue(prev => prev.filter(action => action.id !== actionId))
  }, [])

  const processQueue = React.useCallback(async (
    processor: (action: QueuedAction) => Promise<boolean>
  ) => {
    const results: Array<{ action: QueuedAction; success: boolean; error?: Error }> = []

    for (const action of queue) {
      try {
        logger.debug('Processing queued action', {
          actionId: action.id,
          actionType: action.type,
          retryCount: action.retryCount
        })

        const success = await processor(action)
        results.push({ action, success })

        if (success) {
          removeFromQueue(action.id)
          logger.info('Queued action processed successfully', {
            actionId: action.id,
            actionType: action.type
          })
        } else {
          // Increment retry count
          setQueue(prev => prev.map(a => 
            a.id === action.id 
              ? { ...a, retryCount: (a.retryCount || 0) + 1 }
              : a
          ))

          if ((action.retryCount || 0) >= (action.maxRetries || 3)) {
            removeFromQueue(action.id)
            logger.warn('Queued action exceeded max retries', {
              actionId: action.id,
              actionType: action.type,
              retryCount: action.retryCount
            })
          }
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        results.push({ action, success: false, error: err })
        
        logger.error('Error processing queued action', err, {
          actionId: action.id,
          actionType: action.type
        })
      }
    }

    return results
  }, [queue, removeFromQueue, logger])

  const clearQueue = React.useCallback(() => {
    logger.info('Clearing offline queue', { queueSize: queue.length })
    setQueue([])
  }, [queue.length, logger])

  const getQueueStats = React.useCallback(() => {
    const byType = queue.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const oldestAction = queue.length > 0 
      ? Math.min(...queue.map(a => a.timestamp))
      : null

    return {
      total: queue.length,
      byType,
      oldestTimestamp: oldestAction
    }
  }, [queue])

  return {
    queue,
    queueSize: queue.length,
    addToQueue,
    removeFromQueue,
    processQueue,
    clearQueue,
    getQueueStats
  }
}

/**
 * Offline indicator component
 */
interface OfflineIndicatorProps {
  className?: string
  showWhenOnline?: boolean
  position?: 'top' | 'bottom'
}

export function OfflineIndicator({
  className = '',
  showWhenOnline = false,
  position = 'top'
}: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus()
  const [showReconnected, setShowReconnected] = React.useState(false)

  React.useEffect(() => {
    if (isOnline && !showReconnected) {
      setShowReconnected(true)
      const timer = setTimeout(() => setShowReconnected(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, showReconnected])

  if (isOnline && !showWhenOnline && !showReconnected) {
    return null
  }

  const positionClasses = {
    top: 'top-0',
    bottom: 'bottom-0'
  }

  return (
    <ComponentErrorBoundary>
      <div className={`fixed left-0 right-0 z-50 ${positionClasses[position]} ${className}`}>
        <div className={`px-4 py-2 text-center text-sm font-medium transition-all duration-300 ${
          isOnline 
            ? showReconnected 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-600'
            : 'bg-orange-600 text-white'
        }`}>
          <div className="flex items-center justify-center space-x-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>
                  {showReconnected ? 'Connection restored' : 'Online'}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>You are offline</span>
              </>
            )}
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Offline banner component
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const { queueSize } = useOfflineQueue()

  if (isOnline) {
    return null
  }

  return (
    <ComponentErrorBoundary>
      <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <WifiOff className="h-5 w-5 text-orange-500" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-orange-700">
              You are currently offline. Some features may not be available.
              {queueSize > 0 && (
                <span className="font-medium">
                  {' '}({queueSize} action{queueSize !== 1 ? 's' : ''} queued)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Offline aware component wrapper
 */
interface OfflineAwareProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showQueueInfo?: boolean
}

export function OfflineAware({ 
  children, 
  fallback,
  showQueueInfo = false 
}: OfflineAwareProps) {
  const isOnline = useOnlineStatus()
  const { queueSize } = useOfflineQueue()

  if (!isOnline) {
    if (fallback) {
      return (
        <ComponentErrorBoundary>
          {fallback}
        </ComponentErrorBoundary>
      )
    }

    return (
      <ComponentErrorBoundary>
        <div className="text-center py-8 text-gray-500">
          <WifiOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            You're offline
          </h3>
          <p className="text-sm">
            This feature requires an internet connection.
          </p>
          {showQueueInfo && queueSize > 0 && (
            <p className="text-xs mt-2 text-orange-600">
              {queueSize} action{queueSize !== 1 ? 's' : ''} queued for when you're back online
            </p>
          )}
        </div>
      </ComponentErrorBoundary>
    )
  }

  return <ComponentErrorBoundary>{children}</ComponentErrorBoundary>
}

/**
 * Offline queue status component
 */
export function OfflineQueueStatus() {
  const isOnline = useOnlineStatus()
  const { queue, queueSize, processQueue, clearQueue, getQueueStats } = useOfflineQueue()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [lastProcessed, setLastProcessed] = React.useState<Date | null>(null)

  const stats = getQueueStats()

  const handleProcessQueue = async () => {
    if (!isOnline || isProcessing) return

    setIsProcessing(true)
    try {
      await processQueue(async (action) => {
        // Simulate processing - in real app, this would make actual API calls
        await new Promise(resolve => setTimeout(resolve, 1000))
        return Math.random() > 0.2 // 80% success rate
      })
      setLastProcessed(new Date())
    } catch (error) {
      console.error('Error processing queue:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (queueSize === 0) {
    return null
  }

  return (
    <ComponentErrorBoundary>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Offline Queue ({queueSize} items)
              </h4>
              <p className="text-xs text-blue-700">
                {Object.entries(stats.byType).map(([type, count]) => 
                  `${count} ${type}`
                ).join(', ')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isOnline && (
              <button
                onClick={handleProcessQueue}
                disabled={isProcessing}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    Processing...
                  </>
                ) : (
                  'Process Now'
                )}
              </button>
            )}
            
            <button
              onClick={clearQueue}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </div>
        </div>
        
        {lastProcessed && (
          <p className="text-xs text-blue-600 mt-2">
            Last processed: {lastProcessed.toLocaleTimeString()}
          </p>
        )}
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Offline form wrapper
 */
interface OfflineFormProps {
  children: React.ReactNode
  onSubmit: (data: any) => Promise<void>
  queueOnOffline?: boolean
  className?: string
}

export function OfflineForm({
  children,
  onSubmit,
  queueOnOffline = true,
  className = ''
}: OfflineFormProps) {
  const isOnline = useOnlineStatus()
  const { addToQueue } = useOfflineQueue()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    if (isOnline) {
      setIsSubmitting(true)
      try {
        await onSubmit(data)
      } catch (error) {
        console.error('Form submission error:', error)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    } else if (queueOnOffline) {
      addToQueue({
        type: 'FORM_SUBMISSION',
        data
      })
      
      // Reset form
      e.currentTarget.reset()
    }
  }

  return (
    <ComponentErrorBoundary>
      <form onSubmit={handleSubmit} className={className}>
        {children}
        
        {!isOnline && queueOnOffline && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">
                Form will be submitted when you're back online
              </span>
            </div>
          </div>
        )}
      </form>
    </ComponentErrorBoundary>
  )
}

/**
 * Network status provider
 */
interface NetworkStatusContextType {
  isOnline: boolean
  connectionType?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
}

const NetworkStatusContext = React.createContext<NetworkStatusContextType>({
  isOnline: true
})

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus()
  const [networkInfo, setNetworkInfo] = React.useState<Partial<NetworkStatusContextType>>({})

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          connectionType: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        })
      }

      updateNetworkInfo()
      connection.addEventListener('change', updateNetworkInfo)

      return () => {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  const value: NetworkStatusContextType = {
    isOnline,
    ...networkInfo
  }

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  )
}

export function useNetworkStatus() {
  return React.useContext(NetworkStatusContext)
}