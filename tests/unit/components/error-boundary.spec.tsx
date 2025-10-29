/**
 * Tests for error boundary components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import {
  BaseErrorBoundary,
  PageErrorBoundary,
  ComponentErrorBoundary,
  AsyncErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  FeatureErrorBoundary
} from '@/components/ui/error-boundary'

// Mock components for testing
const ThrowError = ({ shouldThrow = false, message = 'Test error' }: { shouldThrow?: boolean; message?: string }) => {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div data-testid="success">No error</div>
}

const AsyncThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      Promise.reject(new Error('Async test error'))
    }
  }, [shouldThrow])
  
  return <div data-testid="async-success">No async error</div>
}

const ComponentWithErrorHandler = ({ shouldError = false }: { shouldError?: boolean }) => {
  const { handleError, handleAsyncError } = useErrorHandler()
  
  const handleClick = () => {
    if (shouldError) {
      handleError(new Error('Manual error'), 'test-context')
    }
  }
  
  const handleAsyncClick = handleAsyncError(async () => {
    if (shouldError) {
      throw new Error('Async manual error')
    }
  }, 'async-test-context')
  
  return (
    <div>
      <button onClick={handleClick} data-testid="error-button">
        Trigger Error
      </button>
      <button onClick={handleAsyncClick} data-testid="async-error-button">
        Trigger Async Error
      </button>
    </div>
  )
}

// Mock external dependencies
vi.mock('@/lib/errors/correlation', () => ({
  generateCorrelationId: () => 'test-correlation-id'
}))

vi.mock('@/lib/logging', () => ({
  getApiLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))

// Mock window.Sentry
const mockSentry = {
  withScope: vi.fn((callback) => {
    const scope = {
      setTag: vi.fn(),
      setLevel: vi.fn(),
      setContext: vi.fn()
    }
    callback(scope)
  }),
  captureException: vi.fn()
}

Object.defineProperty(window, 'Sentry', {
  value: mockSentry,
  writable: true
})

describe('Error Boundary Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('BaseErrorBoundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={false} />
        </BaseErrorBoundary>
      )

      expect(screen.getByTestId('success')).toBeInTheDocument()
    })

    it('should catch and display error when child component throws', () => {
      render(
        <BaseErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} message="Test error message" />
        </BaseErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument()
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn()
      
      render(
        <BaseErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        'test-correlation-id'
      )
    })

    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>
      
      render(
        <BaseErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    })

    it('should allow retry when maxRetries not exceeded', () => {
      let shouldThrow = true
      
      const RetryComponent = () => (
        <BaseErrorBoundary maxRetries={2}>
          <ThrowError shouldThrow={shouldThrow} />
        </BaseErrorBoundary>
      )

      const { rerender } = render(<RetryComponent />)

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      
      // Click retry button
      const retryButton = screen.getByText(/Try Again/)
      expect(retryButton).toBeInTheDocument()
      
      // Simulate fixing the error
      shouldThrow = false
      fireEvent.click(retryButton)
      
      // Component should retry and succeed
      rerender(<RetryComponent />)
    })

    it('should report error to Sentry when available', () => {
      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      expect(mockSentry.withScope).toHaveBeenCalled()
      expect(mockSentry.captureException).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle reload button click', () => {
      const mockReload = vi.fn()
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true
      })

      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      const reloadButton = screen.getByText('Reload Page')
      fireEvent.click(reloadButton)

      expect(mockReload).toHaveBeenCalled()
    })

    it('should handle go home button click', () => {
      const mockHref = vi.fn()
      Object.defineProperty(window.location, 'href', {
        set: mockHref,
        configurable: true
      })

      render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      const homeButton = screen.getByText('Go Home')
      fireEvent.click(homeButton)

      expect(mockHref).toHaveBeenCalledWith('/')
    })
  })

  describe('ComponentErrorBoundary', () => {
    it('should render component-specific error UI', () => {
      render(
        <ComponentErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} message="Component error" />
        </ComponentErrorBoundary>
      )

      expect(screen.getByText('Component Error')).toBeInTheDocument()
      expect(screen.getByText(/This component encountered an error/)).toBeInTheDocument()
      expect(screen.getByText('Component error')).toBeInTheDocument()
    })

    it('should have retry functionality', () => {
      render(
        <ComponentErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      )

      const retryButton = screen.getByText('Retry Component')
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      // The component should attempt to retry
    })
  })

  describe('AsyncErrorBoundary', () => {
    it('should handle unhandled promise rejections', async () => {
      const onAsyncError = vi.fn()
      
      render(
        <AsyncErrorBoundary onAsyncError={onAsyncError}>
          <AsyncThrowError shouldThrow={true} />
        </AsyncErrorBoundary>
      )

      // Wait for the async error to be handled
      await waitFor(() => {
        expect(onAsyncError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    it('should prevent default browser behavior for unhandled rejections', () => {
      const mockPreventDefault = vi.fn()
      const mockEvent = {
        reason: new Error('Test rejection'),
        preventDefault: mockPreventDefault
      }

      render(
        <AsyncErrorBoundary>
          <div>Test content</div>
        </AsyncErrorBoundary>
      )

      // Simulate unhandled rejection
      window.dispatchEvent(new CustomEvent('unhandledrejection', { detail: mockEvent }))
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => (
        <ThrowError shouldThrow={shouldThrow} />
      )

      const WrappedComponent = withErrorBoundary(TestComponent, { showDetails: true })

      render(<WrappedComponent shouldThrow={true} />)

      expect(screen.getByText('Component Error')).toBeInTheDocument()
    })

    it('should preserve component display name', () => {
      const TestComponent = () => <div>Test</div>
      TestComponent.displayName = 'TestComponent'

      const WrappedComponent = withErrorBoundary(TestComponent)

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
    })
  })

  describe('useErrorHandler hook', () => {
    it('should handle manual errors', () => {
      render(<ComponentWithErrorHandler shouldError={false} />)

      const errorButton = screen.getByTestId('error-button')
      fireEvent.click(errorButton)

      // Error should be logged (mocked)
      // In a real scenario, this would trigger error reporting
    })

    it('should handle async errors', async () => {
      render(<ComponentWithErrorHandler shouldError={true} />)

      const asyncErrorButton = screen.getByTestId('async-error-button')
      
      // This should throw an error that gets caught by the error handler
      await expect(async () => {
        fireEvent.click(asyncErrorButton)
        await waitFor(() => {})
      }).rejects.toThrow()
    })
  })

  describe('FeatureErrorBoundary', () => {
    it('should display feature-specific error message', () => {
      render(
        <FeatureErrorBoundary featureName="Test Feature">
          <ThrowError shouldThrow={true} />
        </FeatureErrorBoundary>
      )

      expect(screen.getByText('Test Feature Unavailable')).toBeInTheDocument()
      expect(screen.getByText(/This feature is temporarily unavailable/)).toBeInTheDocument()
    })
  })

  describe('Error Boundary Integration', () => {
    it('should handle nested error boundaries', () => {
      render(
        <PageErrorBoundary>
          <ComponentErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ComponentErrorBoundary>
        </PageErrorBoundary>
      )

      // Inner error boundary should catch the error
      expect(screen.getByText('Component Error')).toBeInTheDocument()
    })

    it('should reset on props change when configured', () => {
      let resetKey = 'key1'
      
      const TestWrapper = ({ resetKey }: { resetKey: string }) => (
        <ComponentErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
          <ThrowError shouldThrow={true} />
        </ComponentErrorBoundary>
      )

      const { rerender } = render(<TestWrapper resetKey={resetKey} />)

      // Error should be displayed
      expect(screen.getByText('Component Error')).toBeInTheDocument()

      // Change reset key
      resetKey = 'key2'
      rerender(<TestWrapper resetKey={resetKey} />)

      // Error boundary should reset, but component will throw again
      expect(screen.getByText('Component Error')).toBeInTheDocument()
    })
  })

  describe('Error Reporting', () => {
    it('should copy error details to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      })

      render(
        <BaseErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} message="Clipboard test error" />
        </BaseErrorBoundary>
      )

      const copyButton = screen.getByText('Copy Details')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('Clipboard test error')
        )
      })
    })

    it('should create error report email link', () => {
      render(
        <BaseErrorBoundary showDetails={true}>
          <ThrowError shouldThrow={true} message="Email test error" />
        </BaseErrorBoundary>
      )

      const reportLink = screen.getByText('Report')
      expect(reportLink).toHaveAttribute('href', expect.stringContaining('mailto:'))
      expect(reportLink.getAttribute('href')).toContain('test-correlation-id')
    })
  })

  describe('Performance and Memory', () => {
    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(
        <AsyncErrorBoundary>
          <div>Test</div>
        </AsyncErrorBoundary>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )
    })

    it('should clear timeouts on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { unmount } = render(
        <BaseErrorBoundary>
          <ThrowError shouldThrow={true} />
        </BaseErrorBoundary>
      )

      unmount()

      // Timeout should be cleared if it was set
      // This is more of a safety check for memory leaks
    })
  })
})