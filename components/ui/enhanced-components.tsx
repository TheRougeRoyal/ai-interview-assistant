/**
 * Enhanced UI components with error boundaries, loading states, and accessibility
 */

"use client"

import React from 'react'
import { AlertTriangle, CheckCircle, Info, X, ExternalLink } from 'lucide-react'
import { ComponentErrorBoundary, FeatureErrorBoundary } from './error-boundary'
import { LoadingOverlay, useLoading } from './loading-states'
import { OfflineAware } from './offline-state'

/**
 * Enhanced card component with error boundary
 */
interface EnhancedCardProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  requiresOnline?: boolean
}

export function EnhancedCard({
  children,
  title,
  description,
  className = '',
  loading = false,
  error = null,
  onRetry,
  requiresOnline = false
}: EnhancedCardProps) {
  const content = (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-200">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="px-6 py-4">
        <LoadingOverlay isLoading={loading} message="Loading content...">
          {error ? (
            <div className="text-center py-4">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">{error.message}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  Try Again
                </button>
              )}
            </div>
          ) : (
            children
          )}
        </LoadingOverlay>
      </div>
    </div>
  )

  if (requiresOnline) {
    return (
      <OfflineAware fallback={
        <div className={`bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
          <div className="px-6 py-8 text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">This content requires an internet connection</p>
          </div>
        </div>
      }>
        <ComponentErrorBoundary>
          {content}
        </ComponentErrorBoundary>
      </OfflineAware>
    )
  }

  return (
    <ComponentErrorBoundary>
      {content}
    </ComponentErrorBoundary>
  )
}

/**
 * Enhanced button with loading and error states
 */
interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  requiresOnline?: boolean
}

export function EnhancedButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  icon,
  requiresOnline = false,
  disabled,
  className = '',
  ...props
}: EnhancedButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const button = (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  )

  if (requiresOnline) {
    return (
      <OfflineAware fallback={
        <button
          disabled
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            bg-gray-200 text-gray-400 cursor-not-allowed
            ${className}
          `}
        >
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </button>
      }>
        {button}
      </OfflineAware>
    )
  }

  return button
}

/**
 * Enhanced form with error handling and offline support
 */
interface EnhancedFormProps {
  children: React.ReactNode
  onSubmit: (data: FormData) => Promise<void>
  className?: string
  requiresOnline?: boolean
  showOfflineMessage?: boolean
}

export function EnhancedForm({
  children,
  onSubmit,
  className = '',
  requiresOnline = false,
  showOfflineMessage = true
}: EnhancedFormProps) {
  const { isLoading, error, withLoading } = useLoading()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError(null)

    const formData = new FormData(e.currentTarget)
    
    try {
      await withLoading(() => onSubmit(formData))
      // Form submitted successfully
      e.currentTarget.reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission failed'
      setSubmitError(message)
    }
  }

  const form = (
    <ComponentErrorBoundary>
      <form onSubmit={handleSubmit} className={className}>
        <LoadingOverlay isLoading={isLoading} message="Submitting...">
          {children}
        </LoadingOverlay>
        
        {(error || submitError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm text-red-700">
                {error?.message || submitError}
              </span>
            </div>
          </div>
        )}
      </form>
    </ComponentErrorBoundary>
  )

  if (requiresOnline) {
    return (
      <OfflineAware 
        fallback={
          <div className={className}>
            {children}
            {showOfflineMessage && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="text-sm text-orange-700">
                    Form submission requires an internet connection
                  </span>
                </div>
              </div>
            )}
          </div>
        }
      >
        {form}
      </OfflineAware>
    )
  }

  return form
}

/**
 * Enhanced notification/toast component
 */
interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
  autoClose?: boolean
  duration?: number
}

export function Notification({
  type,
  title,
  message,
  action,
  onClose,
  autoClose = true,
  duration = 5000
}: NotificationProps) {
  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, onClose])

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertTriangle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-orange-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />
  }

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200'
  }

  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-orange-800',
    info: 'text-blue-800'
  }

  return (
    <ComponentErrorBoundary>
      <div className={`border rounded-lg p-4 ${bgColors[type]}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icons[type]}
          </div>
          
          <div className="ml-3 flex-1">
            <h4 className={`text-sm font-medium ${textColors[type]}`}>
              {title}
            </h4>
            {message && (
              <p className={`text-sm mt-1 ${textColors[type]} opacity-90`}>
                {message}
              </p>
            )}
            
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className={`text-sm font-medium underline ${textColors[type]} hover:opacity-80`}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className={`ml-3 flex-shrink-0 ${textColors[type]} hover:opacity-80`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Enhanced data table with error handling and loading
 */
interface EnhancedTableProps<T> {
  data: T[]
  columns: Array<{
    key: keyof T
    label: string
    render?: (value: any, item: T) => React.ReactNode
  }>
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  emptyMessage?: string
  className?: string
}

export function EnhancedTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No data available',
  className = ''
}: EnhancedTableProps<T>) {
  if (error) {
    return (
      <ComponentErrorBoundary>
        <div className="text-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">{error.message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Try Again
            </button>
          )}
        </div>
      </ComponentErrorBoundary>
    )
  }

  return (
    <ComponentErrorBoundary>
      <div className={`overflow-hidden ${className}`}>
        <LoadingOverlay isLoading={loading} message="Loading data...">
          {data.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={String(column.key)}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {columns.map((column) => (
                        <td
                          key={String(column.key)}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {column.render 
                            ? column.render(item[column.key], item)
                            : String(item[column.key] || '')
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadingOverlay>
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Enhanced modal with error boundary
 */
interface EnhancedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function EnhancedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = ''
}: EnhancedModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <ComponentErrorBoundary>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className={`
            relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className}
          `}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  )
}

/**
 * Feature wrapper with error boundary
 */
interface FeatureWrapperProps {
  featureName: string
  children: React.ReactNode
  requiresOnline?: boolean
  fallbackMessage?: string
}

export function FeatureWrapper({
  featureName,
  children,
  requiresOnline = false,
  fallbackMessage
}: FeatureWrapperProps) {
  const content = (
    <FeatureErrorBoundary featureName={featureName}>
      {children}
    </FeatureErrorBoundary>
  )

  if (requiresOnline) {
    return (
      <OfflineAware
        fallback={
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">
              {fallbackMessage || `${featureName} requires an internet connection`}
            </p>
          </div>
        }
      >
        {content}
      </OfflineAware>
    )
  }

  return content
}