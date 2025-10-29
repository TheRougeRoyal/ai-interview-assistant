/**
 * Tests for optimistic update functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'

// Import optimistic update utilities
import {
  OptimisticUpdateManager,
  OptimisticPatterns,
  CandidateOptimisticUpdates,
  SessionOptimisticUpdates,
  useOptimisticUpdate
} from '@/lib/api/optimisticUpdates'

// Import enhanced store components
import { enhancedStore } from '@/store/enhanced'
import { useCandidates, useCurrentCandidate } from '@/store/enhanced/hooks'

// Mock API client
const mockApiClient = {
  optimisticRequest: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}

vi.mock('@/lib/api/robustClient', () => ({
  robustApiClient: mockApiClient
}))

vi.mock('@/lib/errors/correlation', () => ({
  generateCorrelationId: () => 'test-correlation-id'
}))

vi.mock('@/lib/logging', () => ({
  getApiLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// Test components
const OptimisticCandidateComponent = () => {
  const { optimisticUpdate, isPending, getOptimisticData } = useOptimisticUpdate()
  const { candidates, actions } = useCandidates()
  const { currentCandidate, setCurrent } = useCurrentCandidate()
  const [updateCount, setUpdateCount] = React.useState(0)

  const handleOptimisticUpdate = async () => {
    const candidateId = 'test-candidate-1'
    const originalCandidate = {
      id: candidateId,
      name: 'John Doe',
      email: 'john@example.com',
      finalScore: 75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionIds: []
    }

    try {
      await optimisticUpdate(
        candidateId,
        originalCandidate,
        { finalScore: 85 },
        async (optimisticData) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100))
          return { ...optimisticData, updatedAt: new Date().toISOString() }
        }
      )
      setUpdateCount(prev => prev + 1)
    } catch (error) {
      console.error('Optimistic update failed:', error)
    }
  }

  const handleFailingUpdate = async () => {
    const candidateId = 'test-candidate-2'
    const originalCandidate = {
      id: candidateId,
      name: 'Jane Doe',
      email: 'jane@example.com',
      finalScore: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionIds: []
    }

    try {
      await optimisticUpdate(
        candidateId,
        originalCandidate,
        { finalScore: 90 },
        async () => {
          throw new Error('API call failed')
        }
      )
    } catch (error) {
      // Expected to fail
    }
  }

  return (
    <div>
      <div data-testid="update-count">{updateCount}</div>
      <div data-testid="pending-test-1">{isPending('test-candidate-1') ? 'pending' : 'not-pending'}</div>
      <div data-testid="pending-test-2">{isPending('test-candidate-2') ? 'pending' : 'not-pending'}</div>
      <div data-testid="optimistic-data-1">
        {JSON.stringify(getOptimisticData('test-candidate-1'))}
      </div>
      <button onClick={handleOptimisticUpdate} data-testid="optimistic-button">
        Optimistic Update
      </button>
      <button onClick={handleFailingUpdate} data-testid="failing-button">
        Failing Update
      </button>
    </div>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={enhancedStore}>
    {children}
  </Provider>
)

describe('Optimistic Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OptimisticUpdateManager', () => {
    let manager: OptimisticUpdateManager<any>

    beforeEach(() => {
      manager = new OptimisticUpdateManager()
    })

    it('should apply optimistic update', () => {
      const originalData = { id: '1', name: 'Original' }
      const optimisticData = { id: '1', name: 'Optimistic' }

      manager.applyUpdate('1', originalData, optimisticData, 'test-correlation')

      expect(manager.isPending('1')).toBe(true)
      expect(manager.getOptimisticData('1')).toEqual(optimisticData)
    })

    it('should confirm optimistic update', () => {
      const originalData = { id: '1', name: 'Original' }
      const optimisticData = { id: '1', name: 'Optimistic' }

      manager.applyUpdate('1', originalData, optimisticData, 'test-correlation')
      manager.confirmUpdate('1')

      expect(manager.isPending('1')).toBe(false)
      expect(manager.getOptimisticData('1')).toBeNull()
    })

    it('should rollback optimistic update', () => {
      const originalData = { id: '1', name: 'Original' }
      const optimisticData = { id: '1', name: 'Optimistic' }

      manager.applyUpdate('1', originalData, optimisticData, 'test-correlation')
      const rolledBackData = manager.rollbackUpdate('1')

      expect(rolledBackData).toEqual(originalData)
      expect(manager.isPending('1')).toBe(false)
    })

    it('should get all pending updates', () => {
      manager.applyUpdate('1', { id: '1' }, { id: '1', name: 'A' }, 'corr-1')
      manager.applyUpdate('2', { id: '2' }, { id: '2', name: 'B' }, 'corr-2')

      const pending = manager.getPendingUpdates()
      expect(pending).toHaveLength(2)
      expect(pending[0].id).toBe('1')
      expect(pending[1].id).toBe('2')
    })

    it('should cleanup stale updates', () => {
      const now = Date.now()
      
      // Mock Date.now to control timestamps
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      manager.applyUpdate('1', { id: '1' }, { id: '1' }, 'corr-1')
      
      // Move time forward beyond timeout
      vi.spyOn(Date, 'now').mockReturnValue(now + 35000) // 35 seconds
      
      manager.cleanup(30000) // 30 second timeout
      
      expect(manager.isPending('1')).toBe(false)
    })

    it('should clear all pending updates', () => {
      manager.applyUpdate('1', { id: '1' }, { id: '1' }, 'corr-1')
      manager.applyUpdate('2', { id: '2' }, { id: '2' }, 'corr-2')

      manager.clearAll()

      expect(manager.getPendingUpdates()).toHaveLength(0)
    })
  })

  describe('OptimisticPatterns', () => {
    beforeEach(() => {
      mockApiClient.optimisticRequest.mockResolvedValue({
        data: { id: 'test-id', name: 'Created' },
        status: 200,
        headers: new Headers(),
        correlationId: 'test-correlation-id'
      })
    })

    it('should handle optimistic create', async () => {
      const onSuccess = vi.fn()
      const onRollback = vi.fn()

      const result = await OptimisticPatterns.create(
        '/api/test',
        { name: 'Test Item' },
        {
          optimisticData: { id: 'temp-id', name: 'Test Item' },
          onSuccess,
          onRollback
        }
      )

      expect(result.data.id).toBe('temp-id')
      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          optimisticData: expect.objectContaining({ id: 'temp-id' })
        })
      )
    })

    it('should handle optimistic update', async () => {
      const originalData = { id: '1', name: 'Original', score: 75 }
      const updates = { score: 85 }

      const result = await OptimisticPatterns.update(
        '/api/test',
        '1',
        updates,
        originalData
      )

      expect(result.data.score).toBe(85)
      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
          optimisticData: expect.objectContaining({ score: 85 })
        })
      )
    })

    it('should handle optimistic delete', async () => {
      const onSuccess = vi.fn()

      await OptimisticPatterns.delete('/api/test', '1', { onSuccess })

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })

    it('should handle batch optimistic updates', async () => {
      const updates = [
        { id: '1', data: { score: 85 } },
        { id: '2', data: { score: 90 } }
      ]
      const originalData = {
        '1': { id: '1', score: 75 },
        '2': { id: '2', score: 80 }
      }

      await OptimisticPatterns.batchUpdate('/api/test', updates, originalData)

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/test/batch',
        expect.objectContaining({
          method: 'PATCH',
          optimisticData: expect.arrayContaining([
            expect.objectContaining({ id: '1', score: 85 }),
            expect.objectContaining({ id: '2', score: 90 })
          ])
        })
      )
    })
  })

  describe('Entity-Specific Optimistic Updates', () => {
    it('should update candidate score optimistically', async () => {
      const originalCandidate = {
        id: 'candidate-1',
        name: 'John Doe',
        email: 'john@example.com',
        finalScore: 75,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionIds: []
      }

      await CandidateOptimisticUpdates.updateScore('candidate-1', 85, originalCandidate)

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/candidates/candidate-1',
        expect.objectContaining({
          method: 'PATCH',
          optimisticData: expect.objectContaining({ finalScore: 85 })
        })
      )
    })

    it('should update candidate profile optimistically', async () => {
      const originalCandidate = {
        id: 'candidate-1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionIds: []
      }
      const profileUpdates = { name: 'John Smith', phone: '+1234567890' }

      await CandidateOptimisticUpdates.updateProfile('candidate-1', profileUpdates, originalCandidate)

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/candidates/candidate-1',
        expect.objectContaining({
          optimisticData: expect.objectContaining({
            name: 'John Smith',
            phone: '+1234567890'
          })
        })
      )
    })

    it('should update session stage optimistically', async () => {
      const originalSession = {
        id: 'session-1',
        candidateId: 'candidate-1',
        stage: 'interviewing',
        currentIndex: 0,
        plan: [],
        answerIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await SessionOptimisticUpdates.updateStage('session-1', 'completed', originalSession)

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/sessions/session-1',
        expect.objectContaining({
          optimisticData: expect.objectContaining({ stage: 'completed' })
        })
      )
    })

    it('should add answer optimistically', async () => {
      const answerData = {
        questionIndex: 1,
        difficulty: 'medium',
        question: 'Test question',
        answerText: 'Test answer',
        durationMs: 300000
      }

      await SessionOptimisticUpdates.addAnswer('session-1', answerData)

      expect(mockApiClient.optimisticRequest).toHaveBeenCalledWith(
        '/api/sessions/session-1/answers',
        expect.objectContaining({
          optimisticData: expect.objectContaining({
            sessionId: 'session-1',
            questionIndex: 1,
            answerText: 'Test answer'
          })
        })
      )
    })
  })

  describe('useOptimisticUpdate Hook', () => {
    it('should handle successful optimistic update', async () => {
      render(
        <TestWrapper>
          <OptimisticCandidateComponent />
        </TestWrapper>
      )

      const button = screen.getByTestId('optimistic-button')
      
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByTestId('update-count')).toHaveTextContent('1')
      })
    })

    it('should show pending state during update', async () => {
      render(
        <TestWrapper>
          <OptimisticCandidateComponent />
        </TestWrapper>
      )

      const button = screen.getByTestId('optimistic-button')
      
      act(() => {
        fireEvent.click(button)
      })

      // Should show pending state immediately
      expect(screen.getByTestId('pending-test-1')).toHaveTextContent('pending')

      await waitFor(() => {
        expect(screen.getByTestId('pending-test-1')).toHaveTextContent('not-pending')
      })
    })

    it('should handle failed optimistic update', async () => {
      render(
        <TestWrapper>
          <OptimisticCandidateComponent />
        </TestWrapper>
      )

      const button = screen.getByTestId('failing-button')
      
      await act(async () => {
        fireEvent.click(button)
      })

      // Should not be pending after failure
      await waitFor(() => {
        expect(screen.getByTestId('pending-test-2')).toHaveTextContent('not-pending')
      })
    })

    it('should provide optimistic data during update', async () => {
      render(
        <TestWrapper>
          <OptimisticCandidateComponent />
        </TestWrapper>
      )

      const button = screen.getByTestId('optimistic-button')
      
      act(() => {
        fireEvent.click(button)
      })

      // Should show optimistic data
      await waitFor(() => {
        const optimisticDataElement = screen.getByTestId('optimistic-data-1')
        expect(optimisticDataElement.textContent).toContain('finalScore')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApiClient.optimisticRequest.mockRejectedValue(new Error('API Error'))

      const onError = vi.fn()

      try {
        await OptimisticPatterns.create(
          '/api/test',
          { name: 'Test' },
          {
            optimisticData: { id: 'temp', name: 'Test' },
            onError
          }
        )
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(onError).toHaveBeenCalledWith(expect.any(Error))
      }
    })

    it('should call rollback function on failure', async () => {
      mockApiClient.optimisticRequest.mockImplementation(async (url, options) => {
        // Simulate failure by calling rollback
        if (options.rollbackFn) {
          options.rollbackFn(new Error('Simulated failure'))
        }
        throw new Error('API call failed')
      })

      const onRollback = vi.fn()

      try {
        await OptimisticPatterns.update(
          '/api/test',
          '1',
          { name: 'Updated' },
          { id: '1', name: 'Original' },
          { onRollback }
        )
      } catch (error) {
        expect(onRollback).toHaveBeenCalled()
      }
    })
  })

  describe('Performance and Cleanup', () => {
    it('should cleanup optimistic updates automatically', () => {
      const cleanupSpy = vi.spyOn(global, 'setInterval')
      
      // Import should trigger the cleanup interval setup
      require('@/lib/api/optimisticUpdates')
      
      expect(cleanupSpy).toHaveBeenCalledWith(
        expect.any(Function),
        30000 // 30 seconds
      )
    })

    it('should handle concurrent optimistic updates', async () => {
      const manager = new OptimisticUpdateManager()
      
      // Apply multiple concurrent updates
      manager.applyUpdate('1', { id: '1' }, { id: '1', name: 'A' }, 'corr-1')
      manager.applyUpdate('2', { id: '2' }, { id: '2', name: 'B' }, 'corr-2')
      manager.applyUpdate('3', { id: '3' }, { id: '3', name: 'C' }, 'corr-3')

      expect(manager.getPendingUpdates()).toHaveLength(3)

      // Confirm some, rollback others
      manager.confirmUpdate('1')
      manager.rollbackUpdate('2')

      expect(manager.getPendingUpdates()).toHaveLength(1)
      expect(manager.isPending('3')).toBe(true)
    })
  })
})