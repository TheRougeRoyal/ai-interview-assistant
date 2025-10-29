/**
 * Optimistic update patterns and utilities for the robust API client
 */

import { robustApiClient } from './robustClient'
import { getApiLogger } from '@/lib/logging'
import { generateCorrelationId } from '@/lib/errors/correlation'
import type { ApiError, ApiResponse } from '@/store/enhanced/apiClient'

/**
 * Optimistic update configuration
 */
export interface OptimisticConfig<T> {
  // The optimistic data to show immediately
  optimisticData: T
  
  // Function to call if the request fails (rollback)
  onRollback?: (error: ApiError) => void
  
  // Function to call when the request succeeds
  onSuccess?: (data: T) => void
  
  // Function to call on any error
  onError?: (error: ApiError) => void
  
  // Timeout for the optimistic update (ms)
  timeout?: number
  
  // Whether to show loading state during the actual request
  showLoading?: boolean
}

/**
 * Optimistic update manager for handling complex update scenarios
 */
export class OptimisticUpdateManager<T extends { id: string }> {
  private pendingUpdates = new Map<string, {
    originalData: T
    optimisticData: T
    correlationId: string
    timestamp: number
  }>()
  
  private logger = getApiLogger()

  /**
   * Apply optimistic update
   */
  applyUpdate(
    id: string,
    originalData: T,
    optimisticData: T,
    correlationId: string = generateCorrelationId()
  ): void {
    this.pendingUpdates.set(id, {
      originalData,
      optimisticData,
      correlationId,
      timestamp: Date.now()
    })

    this.logger.debug('Applied optimistic update', {
      id,
      correlationId,
      timestamp: Date.now()
    })
  }

  /**
   * Confirm optimistic update (remove from pending)
   */
  confirmUpdate(id: string): void {
    const update = this.pendingUpdates.get(id)
    if (update) {
      this.pendingUpdates.delete(id)
      this.logger.debug('Confirmed optimistic update', {
        id,
        correlationId: update.correlationId
      })
    }
  }

  /**
   * Rollback optimistic update
   */
  rollbackUpdate(id: string): T | null {
    const update = this.pendingUpdates.get(id)
    if (update) {
      this.pendingUpdates.delete(id)
      this.logger.warn('Rolled back optimistic update', {
        id,
        correlationId: update.correlationId
      })
      return update.originalData
    }
    return null
  }

  /**
   * Get current optimistic data
   */
  getOptimisticData(id: string): T | null {
    const update = this.pendingUpdates.get(id)
    return update ? update.optimisticData : null
  }

  /**
   * Check if update is pending
   */
  isPending(id: string): boolean {
    return this.pendingUpdates.has(id)
  }

  /**
   * Get all pending updates
   */
  getPendingUpdates(): Array<{ id: string; data: T; correlationId: string }> {
    return Array.from(this.pendingUpdates.entries()).map(([id, update]) => ({
      id,
      data: update.optimisticData,
      correlationId: update.correlationId
    }))
  }

  /**
   * Clear all pending updates
   */
  clearAll(): void {
    this.pendingUpdates.clear()
  }

  /**
   * Clean up old pending updates (older than timeout)
   */
  cleanup(timeout: number = 30000): void {
    const now = Date.now()
    for (const [id, update] of this.pendingUpdates.entries()) {
      if (now - update.timestamp > timeout) {
        this.logger.warn('Cleaning up stale optimistic update', {
          id,
          correlationId: update.correlationId,
          age: now - update.timestamp
        })
        this.pendingUpdates.delete(id)
      }
    }
  }
}

/**
 * Optimistic update patterns for common operations
 */
export const OptimisticPatterns = {
  /**
   * Create entity with optimistic update
   */
  async create<T extends { id?: string }>(
    url: string,
    data: Omit<T, 'id'>,
    config: OptimisticConfig<T>
  ): Promise<ApiResponse<T>> {
    const correlationId = generateCorrelationId()
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const optimisticData = {
      ...config.optimisticData,
      id: tempId
    } as T

    try {
      return await robustApiClient.optimisticRequest(url, {
        method: 'POST',
        body: JSON.stringify(data),
        correlationId,
        optimisticData,
        rollbackFn: config.onRollback,
        onSuccess: config.onSuccess,
        onError: config.onError
      })
    } catch (error) {
      if (config.onError) {
        config.onError(error as ApiError)
      }
      throw error
    }
  },

  /**
   * Update entity with optimistic update
   */
  async update<T extends { id: string }>(
    url: string,
    id: string,
    updates: Partial<T>,
    originalData: T,
    config: Partial<OptimisticConfig<T>> = {}
  ): Promise<ApiResponse<T>> {
    const correlationId = generateCorrelationId()
    
    const optimisticData = {
      ...originalData,
      ...updates,
      updatedAt: new Date().toISOString()
    } as T

    try {
      return await robustApiClient.optimisticRequest(`${url}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        correlationId,
        optimisticData,
        rollbackFn: config.onRollback,
        onSuccess: config.onSuccess,
        onError: config.onError
      })
    } catch (error) {
      if (config.onError) {
        config.onError(error as ApiError)
      }
      throw error
    }
  },

  /**
   * Delete entity with optimistic update
   */
  async delete<T extends { id: string }>(
    url: string,
    id: string,
    config: {
      onRollback?: (error: ApiError) => void
      onSuccess?: () => void
      onError?: (error: ApiError) => void
    } = {}
  ): Promise<ApiResponse<void>> {
    const correlationId = generateCorrelationId()

    try {
      return await robustApiClient.optimisticRequest(`${url}/${id}`, {
        method: 'DELETE',
        correlationId,
        optimisticData: undefined,
        rollbackFn: config.onRollback,
        onSuccess: config.onSuccess,
        onError: config.onError
      })
    } catch (error) {
      if (config.onError) {
        config.onError(error as ApiError)
      }
      throw error
    }
  },

  /**
   * Batch update with optimistic updates
   */
  async batchUpdate<T extends { id: string }>(
    url: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    originalData: Record<string, T>,
    config: {
      onRollback?: (failedIds: string[], error: ApiError) => void
      onSuccess?: (updatedData: T[]) => void
      onError?: (error: ApiError) => void
    } = {}
  ): Promise<ApiResponse<T[]>> {
    const correlationId = generateCorrelationId()
    
    const optimisticData = updates.map(update => ({
      ...originalData[update.id],
      ...update.data,
      updatedAt: new Date().toISOString()
    }))

    try {
      return await robustApiClient.optimisticRequest(`${url}/batch`, {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
        correlationId,
        optimisticData,
        rollbackFn: (error) => {
          const failedIds = updates.map(u => u.id)
          if (config.onRollback) {
            config.onRollback(failedIds, error)
          }
        },
        onSuccess: config.onSuccess,
        onError: config.onError
      })
    } catch (error) {
      if (config.onError) {
        config.onError(error as ApiError)
      }
      throw error
    }
  }
}

/**
 * React hook for optimistic updates (if using React)
 */
export function useOptimisticUpdate<T extends { id: string }>() {
  const manager = new OptimisticUpdateManager<T>()

  const optimisticUpdate = async (
    id: string,
    originalData: T,
    updates: Partial<T>,
    updateFn: (data: T) => Promise<T>
  ) => {
    const optimisticData = { ...originalData, ...updates } as T
    
    // Apply optimistic update immediately
    manager.applyUpdate(id, originalData, optimisticData)
    
    try {
      // Perform actual update
      const result = await updateFn(optimisticData)
      
      // Confirm update on success
      manager.confirmUpdate(id)
      
      return result
    } catch (error) {
      // Rollback on failure
      const rolledBackData = manager.rollbackUpdate(id)
      throw error
    }
  }

  return {
    optimisticUpdate,
    isPending: (id: string) => manager.isPending(id),
    getOptimisticData: (id: string) => manager.getOptimisticData(id),
    getPendingUpdates: () => manager.getPendingUpdates(),
    cleanup: () => manager.cleanup()
  }
}

/**
 * Optimistic update utilities for specific entities
 */
export const CandidateOptimisticUpdates = {
  async updateScore(
    candidateId: string,
    score: number,
    originalCandidate: any
  ) {
    return OptimisticPatterns.update(
      '/api/candidates',
      candidateId,
      { finalScore: score },
      originalCandidate,
      {
        onRollback: (error) => {
          console.error('Failed to update candidate score:', error)
          // Could show toast notification here
        },
        onSuccess: (data) => {
          console.log('Candidate score updated successfully:', data)
        }
      }
    )
  },

  async updateProfile(
    candidateId: string,
    profileUpdates: any,
    originalCandidate: any
  ) {
    return OptimisticPatterns.update(
      '/api/candidates',
      candidateId,
      profileUpdates,
      originalCandidate,
      {
        onRollback: (error) => {
          console.error('Failed to update candidate profile:', error)
        }
      }
    )
  }
}

export const SessionOptimisticUpdates = {
  async updateStage(
    sessionId: string,
    stage: string,
    originalSession: any
  ) {
    return OptimisticPatterns.update(
      '/api/sessions',
      sessionId,
      { stage },
      originalSession,
      {
        onRollback: (error) => {
          console.error('Failed to update session stage:', error)
        }
      }
    )
  },

  async addAnswer(
    sessionId: string,
    answerData: any
  ) {
    return OptimisticPatterns.create(
      `/api/sessions/${sessionId}/answers`,
      answerData,
      {
        optimisticData: {
          ...answerData,
          id: `temp-${Date.now()}`,
          sessionId,
          createdAt: new Date().toISOString()
        },
        onRollback: (error) => {
          console.error('Failed to add answer:', error)
        }
      }
    )
  }
}

/**
 * Global optimistic update manager instance
 */
export const globalOptimisticManager = {
  candidates: new OptimisticUpdateManager(),
  sessions: new OptimisticUpdateManager(),
  answers: new OptimisticUpdateManager()
}

/**
 * Cleanup function to be called periodically
 */
export function cleanupOptimisticUpdates() {
  Object.values(globalOptimisticManager).forEach(manager => {
    manager.cleanup()
  })
}

// Set up automatic cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(cleanupOptimisticUpdates, 30000)
}