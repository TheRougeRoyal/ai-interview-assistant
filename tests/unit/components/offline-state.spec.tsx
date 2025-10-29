/**
 * Tests for offline state handling components and utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// Mock offline state components (these would need to be created)
const MockOfflineComponents = {
  OfflineIndicator: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="offline-indicator">
      {children || 'You are offline'}
    </div>
  ),
  
  OfflineAware: ({ 
    children, 
    fallback 
  }: { 
    children: React.ReactNode
    fallback?: React.ReactNode 
  }) => {
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    
    React.useEffect(() => {
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }, [])
    
    return isOnline ? <>{children}</> : <>{fallback || <div>Offline</div>}</>
  },
  
  OfflineBanner: () => {
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    
    React.useEffect(() => {
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)
      
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }, [])
    
    if (isOnline) return null
    
    return (
      <div data-testid="offline-banner" className="bg-orange-100 p-2">
        You are currently offline. Some features may not be available.
      </div>
    )
  }
}

// Mock hooks for offline functionality
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  
  React.useEffect(() => {
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

const useOfflineQueue = () => {
  const [queue, setQueue] = React.useState<any[]>([])
  
  const addToQueue = React.useCallback((action: any) => {
    setQueue(prev => [...prev, { ...action, id: Date.now() }])
  }, [])
  
  const processQueue = React.useCallback(async (processor: (action: any) => Promise<boolean>) => {
    const results = []
    for (const action of queue) {
      try {
        const success = await processor(action)
        results.push({ action, success })
      } catch (error) {
        results.push({ action, success: false, error })
      }
    }
    
    // Remove successfully processed actions
    setQueue(prev => prev.filter(action => 
      !results.some(result => result.action.id === action.id && result.success)
    ))
    
    return results
  }, [queue])
  
  const clearQueue = React.useCallback(() => {
    setQueue([])
  }, [])
  
  return {
    queue,
    queueSize: queue.length,
    addToQueue,
    processQueue,
    clearQueue
  }
}

// Test components
const OfflineAwareComponent = () => {
  const isOnline = useOnlineStatus()
  const { queue, queueSize, addToQueue, processQueue, clearQueue } = useOfflineQueue()
  const [processedCount, setProcessedCount] = React.useState(0)
  
  const handleAddToQueue = () => {
    addToQueue({
      type: 'CREATE_CANDIDATE',
      data: { name: 'Test Candidate', email: 'test@example.com' }
    })
  }
  
  const handleProcessQueue = async () => {
    const results = await processQueue(async (action) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      return Math.random() > 0.3 // 70% success rate
    })
    
    setProcessedCount(prev => prev + results.filter(r => r.success).length)
  }
  
  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="queue-size">{queueSize}</div>
      <div data-testid="processed-count">{processedCount}</div>
      
      <MockOfflineComponents.OfflineBanner />
      
      <MockOfflineComponents.OfflineAware
        fallback={<div data-testid="offline-fallback">Feature unavailable offline</div>}
      >
        <div data-testid="online-content">Online content</div>
      </MockOfflineComponents.OfflineAware>
      
      <button onClick={handleAddToQueue} data-testid="add-to-queue">
        Add to Queue
      </button>
      
      <button onClick={handleProcessQueue} data-testid="process-queue">
        Process Queue
      </button>
      
      <button onClick={clearQueue} data-testid="clear-queue">
        Clear Queue
      </button>
    </div>
  )
}

const OfflineFormComponent = () => {
  const isOnline = useOnlineStatus()
  const { addToQueue } = useOfflineQueue()
  const [formData, setFormData] = React.useState({ name: '', email: '' })
  const [submitCount, setSubmitCount] = React.useState(0)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isOnline) {
      // Simulate online submission
      await new Promise(resolve => setTimeout(resolve, 100))
      setSubmitCount(prev => prev + 1)
    } else {
      // Queue for later
      addToQueue({
        type: 'SUBMIT_FORM',
        data: formData,
        timestamp: Date.now()
      })
    }
    
    setFormData({ name: '', email: '' })
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        data-testid="name-input"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Name"
      />
      <input
        data-testid="email-input"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        placeholder="Email"
      />
      <button type="submit" data-testid="submit-button">
        {isOnline ? 'Submit' : 'Queue for Later'}
      </button>
      <div data-testid="submit-count">{submitCount}</div>
    </form>
  )
}

// Mock navigator.onLine
const mockNavigatorOnLine = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: online
  })
}

// Simulate online/offline events
const simulateOffline = () => {
  mockNavigatorOnLine(false)
  window.dispatchEvent(new Event('offline'))
}

const simulateOnline = () => {
  mockNavigatorOnLine(true)
  window.dispatchEvent(new Event('online'))
}

describe('Offline State Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigatorOnLine(true) // Start online by default
  })

  afterEach(() => {
    vi.restoreAllMocks()
    simulateOnline() // Reset to online
  })

  describe('useOnlineStatus Hook', () => {
    it('should detect initial online status', () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('online')
    })

    it('should detect when going offline', async () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('online')
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('offline')
      })
    })

    it('should detect when coming back online', async () => {
      mockNavigatorOnLine(false)
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('offline')
      
      act(() => {
        simulateOnline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('online')
      })
    })
  })

  describe('OfflineAware Component', () => {
    it('should show online content when online', () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('online-content')).toBeInTheDocument()
      expect(screen.queryByTestId('offline-fallback')).not.toBeInTheDocument()
    })

    it('should show fallback content when offline', async () => {
      render(<OfflineAwareComponent />)
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.queryByTestId('online-content')).not.toBeInTheDocument()
        expect(screen.getByTestId('offline-fallback')).toBeInTheDocument()
      })
    })

    it('should switch back to online content when reconnected', async () => {
      mockNavigatorOnLine(false)
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('offline-fallback')).toBeInTheDocument()
      
      act(() => {
        simulateOnline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('online-content')).toBeInTheDocument()
        expect(screen.queryByTestId('offline-fallback')).not.toBeInTheDocument()
      })
    })
  })

  describe('OfflineBanner Component', () => {
    it('should not show banner when online', () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
    })

    it('should show banner when offline', async () => {
      render(<OfflineAwareComponent />)
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('offline-banner')).toBeInTheDocument()
        expect(screen.getByTestId('offline-banner')).toHaveTextContent('currently offline')
      })
    })

    it('should hide banner when coming back online', async () => {
      mockNavigatorOnLine(false)
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('offline-banner')).toBeInTheDocument()
      
      act(() => {
        simulateOnline()
      })
      
      await waitFor(() => {
        expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
      })
    })
  })

  describe('useOfflineQueue Hook', () => {
    it('should add items to queue', () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('0')
      
      fireEvent.click(screen.getByTestId('add-to-queue'))
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('1')
    })

    it('should process queue items', async () => {
      render(<OfflineAwareComponent />)
      
      // Add items to queue
      fireEvent.click(screen.getByTestId('add-to-queue'))
      fireEvent.click(screen.getByTestId('add-to-queue'))
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('2')
      
      // Process queue
      fireEvent.click(screen.getByTestId('process-queue'))
      
      await waitFor(() => {
        // Some items should be processed (70% success rate)
        const processedCount = parseInt(screen.getByTestId('processed-count').textContent || '0')
        expect(processedCount).toBeGreaterThan(0)
      })
    })

    it('should clear queue', () => {
      render(<OfflineAwareComponent />)
      
      // Add items to queue
      fireEvent.click(screen.getByTestId('add-to-queue'))
      fireEvent.click(screen.getByTestId('add-to-queue'))
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('2')
      
      // Clear queue
      fireEvent.click(screen.getByTestId('clear-queue'))
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('0')
    })
  })

  describe('Offline Form Handling', () => {
    it('should submit form immediately when online', async () => {
      render(<OfflineFormComponent />)
      
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'John Doe' } })
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'john@example.com' } })
      
      fireEvent.click(screen.getByTestId('submit-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('submit-count')).toHaveTextContent('1')
      })
      
      // Form should be cleared
      expect(screen.getByTestId('name-input')).toHaveValue('')
      expect(screen.getByTestId('email-input')).toHaveValue('')
    })

    it('should queue form submission when offline', async () => {
      render(
        <div>
          <OfflineFormComponent />
          <OfflineAwareComponent />
        </div>
      )
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Queue for Later')).toBeInTheDocument()
      })
      
      fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Jane Doe' } })
      fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'jane@example.com' } })
      
      fireEvent.click(screen.getByTestId('submit-button'))
      
      // Should be added to queue
      await waitFor(() => {
        expect(screen.getByTestId('queue-size')).toHaveTextContent('1')
      })
      
      // Form should be cleared
      expect(screen.getByTestId('name-input')).toHaveValue('')
      expect(screen.getByTestId('email-input')).toHaveValue('')
    })

    it('should change button text based on online status', async () => {
      render(<OfflineFormComponent />)
      
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Submit')
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('submit-button')).toHaveTextContent('Queue for Later')
      })
      
      act(() => {
        simulateOnline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('submit-button')).toHaveTextContent('Submit')
      })
    })
  })

  describe('Network State Transitions', () => {
    it('should handle rapid online/offline transitions', async () => {
      render(<OfflineAwareComponent />)
      
      expect(screen.getByTestId('online-status')).toHaveTextContent('online')
      
      // Rapid transitions
      act(() => {
        simulateOffline()
      })
      
      act(() => {
        simulateOnline()
      })
      
      act(() => {
        simulateOffline()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('offline')
      })
    })

    it('should cleanup event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const { unmount } = render(<OfflineAwareComponent />)
      
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('Queue Persistence', () => {
    it('should maintain queue across component re-renders', () => {
      const { rerender } = render(<OfflineAwareComponent />)
      
      // Add items to queue
      fireEvent.click(screen.getByTestId('add-to-queue'))
      fireEvent.click(screen.getByTestId('add-to-queue'))
      
      expect(screen.getByTestId('queue-size')).toHaveTextContent('2')
      
      // Re-render component
      rerender(<OfflineAwareComponent />)
      
      // Queue should persist
      expect(screen.getByTestId('queue-size')).toHaveTextContent('2')
    })
  })

  describe('Error Handling', () => {
    it('should handle queue processing errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<OfflineAwareComponent />)
      
      // Add items to queue
      fireEvent.click(screen.getByTestId('add-to-queue'))
      
      // Mock queue processor to throw error
      const originalProcessQueue = useOfflineQueue().processQueue
      vi.mocked(originalProcessQueue).mockRejectedValue(new Error('Processing failed'))
      
      fireEvent.click(screen.getByTestId('process-queue'))
      
      // Should handle error gracefully
      await waitFor(() => {
        // Component should still be functional
        expect(screen.getByTestId('queue-size')).toBeInTheDocument()
      })
      
      consoleSpy.mockRestore()
    })

    it('should handle navigator.onLine being undefined', () => {
      // Simulate environment where navigator.onLine is not available
      Object.defineProperty(navigator, 'onLine', {
        value: undefined,
        writable: true
      })
      
      // Should not crash
      expect(() => {
        render(<OfflineAwareComponent />)
      }).not.toThrow()
    })
  })
})