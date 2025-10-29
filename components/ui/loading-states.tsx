/**
 * Loading state components with error boundaries and accessibility
 */

"use client"

import React from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { ComponentErrorBoundary } from './error-boundary'

/**
 * Loading overlay component
 */
interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
  showSpinner?: boolean
  className?: string
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  children,
  showSpinner = true,
  className = ''
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          {showSpinner && <Loader2 className="h-5 w-5 animate-spin" />}
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  )
}

/**
 * Page loading component
 */
interface PageLoadingProps {
  message?: string
  showProgress?: boolean
  progress?: number
}

export function PageLoading({
  message = 'Loading...',
  showProgress = false,
  progress = 0
}: PageLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">{message}</p>
          {showProgress && (
            <div className="w-64 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Card skeleton component
 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`border rounded-lg p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  )
}

/**
 * Table skeleton component
 */
interface TableSkeletonProps {
  rows?: number
  columns?: number
  className?: string
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: TableSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-200 rounded animate-pulse"
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * List skeleton component
 */
interface ListSkeletonProps {
  items?: number
  showAvatar?: boolean
  className?: string
}

export function ListSkeleton({ 
  items = 5, 
  showAvatar = false, 
  className = '' 
}: ListSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3">
          {showAvatar && (
            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
          )}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Button loading state
 */
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center ${className} ${
        isLoading ? 'cursor-not-allowed opacity-75' : ''
      }`}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  )
}

/**
 * Inline loading component
 */
interface InlineLoadingProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export function InlineLoading({ 
  size = 'md', 
  message, 
  className = '' 
}: InlineLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  )
}

/**
 * Loading state with retry
 */
interface LoadingWithRetryProps {
  isLoading: boolean
  error?: Error | null
  onRetry?: () => void
  children: React.ReactNode
  loadingMessage?: string
  errorMessage?: string
}

export function LoadingWithRetry({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage = 'Loading...',
  errorMessage
}: LoadingWithRetryProps) {
  if (error) {
    return (
      <ComponentErrorBoundary
        fallback={
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                {errorMessage || 'Something went wrong'}
              </h3>
              <p className="text-sm text-gray-600">{error.message}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
            )}
          </div>
        }
      >
        {children}
      </ComponentErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <InlineLoading size="lg" message={loadingMessage} />
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Progressive loading component
 */
interface ProgressiveLoadingProps {
  stages: Array<{
    name: string
    duration?: number
    message?: string
  }>
  currentStage: number
  className?: string
}

export function ProgressiveLoading({
  stages,
  currentStage,
  className = ''
}: ProgressiveLoadingProps) {
  const progress = ((currentStage + 1) / stages.length) * 100

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">
          {stages[currentStage]?.name || 'Loading...'}
        </h3>
        {stages[currentStage]?.message && (
          <p className="text-sm text-gray-600 mt-1">
            {stages[currentStage].message}
          </p>
        )}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="text-center text-sm text-gray-500">
        Step {currentStage + 1} of {stages.length}
      </div>
    </div>
  )
}

/**
 * Hook for managing loading states
 */
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)
  const [error, setError] = React.useState<Error | null>(null)

  const withLoading = React.useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = React.useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    withLoading,
    reset,
    setLoading: setIsLoading,
    setError
  }
}

/**
 * Hook for progressive loading
 */
export function useProgressiveLoading(stages: string[]) {
  const [currentStage, setCurrentStage] = React.useState(0)
  const [isComplete, setIsComplete] = React.useState(false)

  const nextStage = React.useCallback(() => {
    setCurrentStage(prev => {
      const next = prev + 1
      if (next >= stages.length) {
        setIsComplete(true)
        return prev
      }
      return next
    })
  }, [stages.length])

  const reset = React.useCallback(() => {
    setCurrentStage(0)
    setIsComplete(false)
  }, [])

  const goToStage = React.useCallback((stage: number) => {
    if (stage >= 0 && stage < stages.length) {
      setCurrentStage(stage)
      setIsComplete(false)
    }
  }, [stages.length])

  return {
    currentStage,
    isComplete,
    nextStage,
    reset,
    goToStage,
    progress: ((currentStage + 1) / stages.length) * 100
  }
}