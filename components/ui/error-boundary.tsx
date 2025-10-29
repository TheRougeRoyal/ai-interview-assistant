/**
 * Error boundary components for graceful error handling
 */

"use client"

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, ExternalLink } from 'lucide-react'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  retryCount: number
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  showDetails?: boolean
  maxRetries?: number
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  level?: 'page' | 'component' | 'async'
}

/**
 * Base error boundary component
 */
export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private logger = getApiLogger()
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateCorrelationId()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    const { errorId } = this.state

    // Log error with correlation ID
    this.logger.error('Error boundary caught error', error, {
      errorId,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component'
    })

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorId)
    }

    // Report to external error tracking
    if (typeof window !== 'undefined') {
      this.reportError(error, errorInfo, errorId)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError } = this.state

    // Reset error boundary when props change
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      )

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // Report to Sentry if available
    if (window.Sentry) {
      window.Sentry.withScope((scope: any) => {
        scope.setTag('errorBoundary', this.props.level || 'component')
        scope.setTag('errorId', errorId)
        scope.setLevel('error')
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack
        })
        window.Sentry.captureException(error)
      })
    }

    // Report to other error tracking services
  if (window.LogRocket) {
      window.LogRocket.captureException(error)
    }

    // Custom error reporting
    if (process.env.NEXT_PUBLIC_ERROR_REPORTING_URL) {
      fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(reportingError => {
        console.error('Failed to report error:', reportingError)
      })
    }
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    })
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount < maxRetries) {
      this.logger.info('Retrying after error', {
        errorId: this.state.errorId,
        retryCount: retryCount + 1,
        maxRetries
      })

      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state
    const details = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }

    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => {
        // Could show a toast notification here
        console.log('Error details copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy error details:', err)
      })
  }

  render() {
    const { hasError, error, errorId, retryCount } = this.state
    const { children, fallback, showDetails = false, maxRetries = 3 } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Something went wrong
                </h1>
                <p className="text-sm text-gray-500">
                  Error ID: {errorId}
                </p>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified.
            </p>

            {showDetails && error && (
              <div className="mb-6 p-3 bg-gray-100 rounded border">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Error Details
                </h3>
                <p className="text-xs text-gray-700 font-mono break-all">
                  {error.message}
                </p>
                {error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              {retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              )}

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </button>

              {showDetails && (
                <div className="flex space-x-2">
                  <button
                    onClick={this.copyErrorDetails}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Details
                  </button>
                  
                  <a
                    href={`mailto:support@example.com?subject=Error Report - ${errorId}&body=Error ID: ${errorId}%0AError: ${encodeURIComponent(error?.message || 'Unknown error')}`}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Report
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Page-level error boundary
 */
export class PageErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super({ ...props, level: 'page' })
  }
}

/**
 * Component-level error boundary
 */
export class ComponentErrorBoundary extends BaseErrorBoundary {
  constructor(props: ErrorBoundaryProps) {
    super({ ...props, level: 'component' })
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback, showDetails = false } = this.props

    if (hasError) {
      if (fallback) {
        return fallback
      }

      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center mb-2">
            <Bug className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800">
              Component Error
            </h3>
          </div>
          
          <p className="text-sm text-red-700 mb-3">
            This component encountered an error and couldn't render properly.
          </p>

          {showDetails && error && (
            <details className="mb-3">
              <summary className="text-xs text-red-600 cursor-pointer">
                Error Details (ID: {errorId})
              </summary>
              <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                {error.message}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleRetry}
            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            Retry Component
          </button>
        </div>
      )
    }

    return children
  }
}

/**
 * Async error boundary for handling promise rejections
 */
export class AsyncErrorBoundary extends Component<
  ErrorBoundaryProps & { onAsyncError?: (error: Error) => void },
  ErrorBoundaryState
> {
  private logger = getApiLogger()

  constructor(props: ErrorBoundaryProps & { onAsyncError?: (error: Error) => void }) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    }
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))

    const errorId = generateCorrelationId()

    this.logger.error('Unhandled promise rejection', error, { errorId })

    if (this.props.onAsyncError) {
      this.props.onAsyncError(error)
    }

    // Prevent the default browser behavior
    event.preventDefault()
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateCorrelationId()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props
    const { errorId } = this.state

    this.logger.error('Async error boundary caught error', error, {
      errorId,
      componentStack: errorInfo.componentStack
    })

    this.setState({ errorInfo })

    if (onError) {
      onError(error, errorInfo, errorId)
    }
  }

  render() {
    const { children } = this.props
    return children
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ComponentErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ComponentErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const logger = getApiLogger()

  const handleError = React.useCallback((error: Error, context?: string) => {
    const errorId = generateCorrelationId()
    
    logger.error('Component error handled', error, {
      errorId,
      context
    })

    // Report to error tracking
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.withScope((scope: any) => {
        scope.setTag('errorHandler', 'useErrorHandler')
        scope.setTag('errorId', errorId)
        if (context) {
          scope.setTag('context', context)
        }
        window.Sentry.captureException(error)
      })
    }

    return errorId
  }, [logger])

  const handleAsyncError = React.useCallback((asyncFn: () => Promise<any>, context?: string) => {
    return async () => {
      try {
        return await asyncFn()
      } catch (error) {
        handleError(error as Error, context)
        throw error
      }
    }
  }, [handleError])

  return { handleError, handleAsyncError }
}

/**
 * Error boundary for specific features
 */
export function FeatureErrorBoundary({ 
  children, 
  featureName 
}: { 
  children: ReactNode
  featureName: string 
}) {
  return (
    <ComponentErrorBoundary
      onError={(error, errorInfo, errorId) => {
        console.error(`Error in ${featureName}:`, error)
      }}
      fallback={
        <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">
              {featureName} Unavailable
            </h3>
          </div>
          <p className="text-sm text-yellow-700">
            This feature is temporarily unavailable. Please try again later.
          </p>
        </div>
      }
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ComponentErrorBoundary>
  )
}