/**
 * Enhanced Redux middleware for optimistic updates, error handling, and persistence
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit'
import type { EnhancedRootState } from './types'
import { 
  addOptimisticUpdate, 
  removeOptimisticUpdate, 
  revertOptimisticUpdate 
} from './entities'
import { 
  setLoadingState, 
  setErrorState, 
  clearErrorState 
} from './ui'
import { generateCorrelationId, getCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * Optimistic updates middleware
 * Handles optimistic updates for better UX
 */
export const optimisticUpdatesMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    const logger = getApiLogger()
    
    // Handle optimistic actions
    if (action.type.endsWith('/pending') && action.meta?.optimistic) {
      const correlationId = action.meta.correlationId || generateCorrelationId()
      
      logger.debug('Starting optimistic update', {
        actionType: action.type,
        correlationId
      })
      
      // Add optimistic update
      store.dispatch(addOptimisticUpdate({
        id: correlationId,
        type: action.meta.optimisticType || 'update',
        entityType: action.meta.entityType,
        entityId: action.meta.entityId,
        optimisticData: action.meta.optimisticData,
        originalData: action.meta.originalData
      }))
    }
    
    // Handle successful completion of optimistic actions
    if (action.type.endsWith('/fulfilled') && action.meta?.optimistic) {
      const correlationId = action.meta.correlationId
      
      if (correlationId) {
        logger.debug('Completing optimistic update', {
          actionType: action.type,
          correlationId
        })
        
        // Remove optimistic update
        store.dispatch(removeOptimisticUpdate(correlationId))
      }
    }
    
    // Handle failed optimistic actions
    if (action.type.endsWith('/rejected') && action.meta?.optimistic) {
      const correlationId = action.meta.correlationId
      
      if (correlationId) {
        logger.warn('Reverting optimistic update', {
          actionType: action.type,
          correlationId,
          error: action.payload
        })
        
        // Revert optimistic update
        store.dispatch(revertOptimisticUpdate(correlationId))
      }
    }
    
    return next(action)
  }

/**
 * Error handling middleware
 * Centralizes error handling and logging
 */
export const errorHandlingMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    const logger = getApiLogger()
    
    // Handle pending actions
    if (action.type.endsWith('/pending')) {
      const [entityType, operation] = action.type.split('/')[0].split('_')
      
      // Clear previous errors
      store.dispatch(clearErrorState({
        category: entityType,
        operation
      }))
      
      // Set loading state
      store.dispatch(setLoadingState({
        category: entityType,
        operation,
        loading: true
      }))
    }
    
    // Handle fulfilled actions
    if (action.type.endsWith('/fulfilled')) {
      const [entityType, operation] = action.type.split('/')[0].split('_')
      
      // Clear loading state
      store.dispatch(setLoadingState({
        category: entityType,
        operation,
        loading: false
      }))
      
      logger.debug('Action completed successfully', {
        actionType: action.type,
        correlationId: getCorrelationId()
      })
    }
    
    // Handle rejected actions
    if (action.type.endsWith('/rejected')) {
      const [entityType, operation] = action.type.split('/')[0].split('_')
      
      // Clear loading state
      store.dispatch(setLoadingState({
        category: entityType,
        operation,
        loading: false
      }))
      
      // Set error state
      store.dispatch(setErrorState({
        category: entityType,
        operation,
        error: action.payload
      }))
      
      logger.error('Action failed', action.payload, {
        actionType: action.type,
        correlationId: getCorrelationId()
      })
    }
    
    return next(action)
  }

/**
 * Persistence middleware
 * Handles state persistence with error recovery
 */
export const persistenceMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    const result = next(action)
    
    // Only persist certain actions
    const persistableActions = [
      'entities/',
      'collections/',
      'ui/setTheme',
      'ui/setSelections',
      'ui/setFilters'
    ]
    
    const shouldPersist = persistableActions.some(prefix => 
      action.type.startsWith(prefix)
    )
    
    if (shouldPersist && typeof window !== 'undefined') {
      try {
        const state = store.getState()
        
        // Only persist non-sensitive data
        const persistableState = {
          ui: {
            theme: state.ui.theme,
            selections: state.ui.selections,
            filters: state.ui.filters
          },
          cache: state.cache
        }
        
        localStorage.setItem('enhanced-redux-state', JSON.stringify(persistableState))
      } catch (error) {
        console.warn('Failed to persist state:', error)
      }
    }
    
    return result
  }

/**
 * Cache invalidation middleware
 * Handles cache invalidation based on actions
 */
export const cacheInvalidationMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    const result = next(action)
    
    // Invalidate cache on mutations
    const mutationActions = [
      'addCandidate',
      'updateCandidate',
      'removeCandidate',
      'addSession',
      'updateSession',
      'removeSession',
      'addAnswer',
      'updateAnswer',
      'removeAnswer'
    ]
    
    if (mutationActions.some(actionType => action.type.includes(actionType))) {
      // Mark related cache entries as stale
      const state = store.getState()
      const updatedCache = { ...state.cache }
      
      // Mark all candidate-related cache as stale
      if (action.type.includes('Candidate')) {
        Object.keys(updatedCache).forEach(key => {
          if (key.includes('candidates')) {
            updatedCache[key] = {
              ...updatedCache[key],
              isStale: true
            }
          }
        })
      }
      
      // Mark all session-related cache as stale
      if (action.type.includes('Session')) {
        Object.keys(updatedCache).forEach(key => {
          if (key.includes('sessions')) {
            updatedCache[key] = {
              ...updatedCache[key],
              isStale: true
            }
          }
        })
      }
    }
    
    return result
  }

/**
 * Correlation ID middleware
 * Adds correlation IDs to actions for tracing
 */
export const correlationMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    // Add correlation ID if not present
    if (!action.meta?.correlationId) {
      action.meta = {
        ...action.meta,
        correlationId: getCorrelationId()
      }
    }
    
    return next(action)
  }

/**
 * Performance monitoring middleware
 * Tracks action performance and logs slow actions
 */
export const performanceMiddleware: any = 
  (store: any) => 
  (next: any) => 
  (action: any) => {
    const logger = getApiLogger()
    const startTime = performance.now()
    
    const result = next(action)
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Log slow actions
    if (duration > 100) { // Log actions taking more than 100ms
      logger.warn('Slow Redux action detected', {
        actionType: action.type,
        duration: Math.round(duration),
        correlationId: action.meta?.correlationId
      })
    }
    
    // Log performance metrics for async actions
    if (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')) {
      logger.debug('Redux action performance', {
        actionType: action.type,
        duration: Math.round(duration),
        correlationId: action.meta?.correlationId
      })
    }
    
    return result
  }

/**
 * Combined middleware array
 */
export const enhancedMiddleware = [
  correlationMiddleware,
  optimisticUpdatesMiddleware,
  errorHandlingMiddleware,
  cacheInvalidationMiddleware,
  persistenceMiddleware,
  performanceMiddleware
]