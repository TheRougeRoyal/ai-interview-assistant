/**
 * Enhanced Redux hooks with optimistic updates and error handling
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { 
  EnhancedRootState, 
  CandidateEntity, 
  SessionEntity, 
  AnswerEntity,
  LoadingStates,
  ErrorStates
} from './types'
import {
  fetchCandidates,
  createCandidate,
  updateCandidateById,
  fetchSessions,
  createSession,
  updateSessionById,
  fetchAnswers,
  createAnswer,
  updateAnswerById,
  syncSessionWithNormalizedState
} from './integration'
import {
  selectCandidateList,
  selectSessionList,
  selectAnswerList,
  selectCandidatesLoading,
  selectCandidateCreating,
  selectSessionsLoading,
  selectCandidatesError,
  selectSessionsError,
  selectFilteredCandidates,
  selectFilteredSessions,
  selectCandidateStats,
  selectSessionStats,
  selectCurrentCandidate,
  selectCurrentSession
} from './selectors'
import {
  setCandidateFilters,
  setSessionFilters,
  setCurrentCandidate,
  setCurrentSession,
  addToast
} from './ui'
import { generateCorrelationId } from '@/lib/errors/correlation'
import { getApiLogger } from '@/lib/logging'

/**
 * Enhanced dispatch hook with error handling
 */
export const useEnhancedDispatch = () => {
  const dispatch = useDispatch()
  const logger = getApiLogger()

  return useCallback((action: any) => {
    try {
      return dispatch(action)
    } catch (error) {
      logger.error('Dispatch error', error, {
        actionType: action?.type,
        correlationId: generateCorrelationId()
      })
      throw error
    }
  }, [dispatch, logger])
}

/**
 * Enhanced selector hook with error boundaries
 */
export const useEnhancedSelector = <T>(
  selector: (state: any) => T,
  fallback?: T
): T => {
  return useSelector((state: any) => {
    try {
      return selector(state)
    } catch (error) {
      console.warn('Selector error:', error)
      return fallback as T
    }
  })
}

/**
 * Candidates management hook
 */
export const useCandidates = () => {
  const dispatch = useEnhancedDispatch()
  const candidates = useEnhancedSelector(selectCandidateList, [])
  const filteredCandidates = useEnhancedSelector(selectFilteredCandidates, [])
  const loading = useEnhancedSelector(selectCandidatesLoading, false)
  const creating = useEnhancedSelector(selectCandidateCreating, false)
  const error = useEnhancedSelector(selectCandidatesError, null)
  const stats = useEnhancedSelector(selectCandidateStats, {
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    averageScore: 0
  })

  const fetchList = useCallback(async (params?: {
    page?: number
    limit?: number
    search?: string
  }) => {
    try {
      await dispatch(fetchCandidates(params)).unwrap()
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to fetch candidates'
      }))
      throw error
    }
  }, [dispatch])

  const create = useCallback(async (candidateData: Partial<CandidateEntity>) => {
    try {
      const result = await dispatch(createCandidate(candidateData)).unwrap()
      dispatch(addToast({
        type: 'success',
        message: 'Candidate created successfully'
      }))
      return result.candidate
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to create candidate'
      }))
      throw error
    }
  }, [dispatch])

  const update = useCallback(async (id: string, updates: Partial<CandidateEntity>) => {
    try {
      const result = await dispatch(updateCandidateById({ id, updates })).unwrap()
      dispatch(addToast({
        type: 'success',
        message: 'Candidate updated successfully'
      }))
      return result.candidate
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update candidate'
      }))
      throw error
    }
  }, [dispatch])

  const setFilters = useCallback((filters: any) => {
    dispatch(setCandidateFilters(filters))
  }, [dispatch])

  return {
    candidates,
    filteredCandidates,
    loading,
    creating,
    error,
    stats,
    actions: {
      fetchList,
      create,
      update,
      setFilters
    }
  }
}

/**
 * Sessions management hook
 */
export const useSessions = () => {
  const dispatch = useEnhancedDispatch()
  const sessions = useEnhancedSelector(selectSessionList, [])
  const filteredSessions = useEnhancedSelector(selectFilteredSessions, [])
  const loading = useEnhancedSelector(selectSessionsLoading, false)
  const error = useEnhancedSelector(selectSessionsError, null)
  const stats = useEnhancedSelector(selectSessionStats, {
    total: 0,
    byStage: {}
  })

  const fetchList = useCallback(async (params?: {
    candidateId?: string
    page?: number
    limit?: number
  }) => {
    try {
      await dispatch(fetchSessions(params)).unwrap()
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to fetch sessions'
      }))
      throw error
    }
  }, [dispatch])

  const create = useCallback(async (sessionData: Partial<SessionEntity>) => {
    try {
      const result = await dispatch(createSession(sessionData)).unwrap()
      dispatch(addToast({
        type: 'success',
        message: 'Session created successfully'
      }))
      return result.session
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to create session'
      }))
      throw error
    }
  }, [dispatch])

  const update = useCallback(async (id: string, updates: Partial<SessionEntity>) => {
    try {
      const result = await dispatch(updateSessionById({ id, updates })).unwrap()
      dispatch(addToast({
        type: 'success',
        message: 'Session updated successfully'
      }))
      return result.session
    } catch (error) {
      dispatch(addToast({
        type: 'error',
        message: 'Failed to update session'
      }))
      throw error
    }
  }, [dispatch])

  const setFilters = useCallback((filters: any) => {
    dispatch(setSessionFilters(filters))
  }, [dispatch])

  return {
    sessions,
    filteredSessions,
    loading,
    error,
    stats,
    actions: {
      fetchList,
      create,
      update,
      setFilters
    }
  }
}

/**
 * Current candidate hook
 */
export const useCurrentCandidate = () => {
  const dispatch = useEnhancedDispatch()
  const currentCandidate = useEnhancedSelector(selectCurrentCandidate, null)

  const setCurrent = useCallback((candidateId: string | null) => {
    dispatch(setCurrentCandidate(candidateId))
  }, [dispatch])

  return {
    currentCandidate,
    setCurrent
  }
}

/**
 * Current session hook
 */
export const useCurrentSession = () => {
  const dispatch = useEnhancedDispatch()
  const currentSession = useEnhancedSelector(selectCurrentSession, null)

  const setCurrent = useCallback((sessionId: string | null) => {
    dispatch(setCurrentSession(sessionId))
  }, [dispatch])

  return {
    currentSession,
    setCurrent
  }
}

/**
 * Optimistic updates hook
 */
export const useOptimisticUpdates = <T extends { id: string }>(
  entityType: keyof EnhancedRootState['entities'],
  updateFn: (id: string, updates: Partial<T>) => Promise<T>
) => {
  const dispatch = useEnhancedDispatch()
  const optimisticUpdatesRef = useRef<Map<string, any>>(new Map())

  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<T>,
    optimisticData: Partial<T>
  ) => {
    const correlationId = generateCorrelationId()
    
    try {
      // Store optimistic data
      optimisticUpdatesRef.current.set(id, optimisticData)
      
      // Apply optimistic update immediately
      // This would be handled by the optimistic middleware
      
      // Make actual API call
      const result = await updateFn(id, updates)
      
      // Clear optimistic data on success
      optimisticUpdatesRef.current.delete(id)
      
      return result
    } catch (error) {
      // Revert optimistic update on failure
      optimisticUpdatesRef.current.delete(id)
      throw error
    }
  }, [updateFn])

  const getOptimisticData = useCallback((id: string) => {
    return optimisticUpdatesRef.current.get(id)
  }, [])

  const hasOptimisticUpdate = useCallback((id: string) => {
    return optimisticUpdatesRef.current.has(id)
  }, [])

  return {
    optimisticUpdate,
    getOptimisticData,
    hasOptimisticUpdate
  }
}

/**
 * Auto-sync hook for legacy state integration
 */
export const useAutoSync = () => {
  const dispatch = useEnhancedDispatch()
  const legacyState = useEnhancedSelector((state: any) => state.legacy, {})

  useEffect(() => {
    // Sync legacy session state with normalized state
    if (legacyState.session) {
      dispatch(syncSessionWithNormalizedState(legacyState.session))
    }
  }, [dispatch, legacyState.session])

  const syncNow = useCallback(() => {
    if (legacyState.session) {
      dispatch(syncSessionWithNormalizedState(legacyState.session))
    }
  }, [dispatch, legacyState.session])

  return { syncNow }
}

/**
 * Error handling hook
 */
export const useErrorHandler = () => {
  const dispatch = useEnhancedDispatch()

  const handleError = useCallback((error: any, context?: string) => {
    const logger = getApiLogger()
    
    logger.error('Application error', error, {
      context,
      correlationId: generateCorrelationId()
    })

    dispatch(addToast({
      type: 'error',
      message: error?.message || 'An unexpected error occurred'
    }))
  }, [dispatch])

  const handleAsyncError = useCallback((asyncFn: () => Promise<any>, context?: string) => {
    return async (...args: any[]) => {
      try {
        return await asyncFn.apply(null, args)
      } catch (error) {
        handleError(error, context)
        throw error
      }
    }
  }, [handleError])

  return {
    handleError,
    handleAsyncError
  }
}

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(Date.now())
  const logger = getApiLogger()

  useEffect(() => {
    renderCountRef.current++
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTimeRef.current
    lastRenderTimeRef.current = now

    // Log slow renders
    if (timeSinceLastRender > 100 && renderCountRef.current > 1) {
      logger.warn('Slow component render detected', {
        component: componentName,
        renderTime: timeSinceLastRender,
        renderCount: renderCountRef.current
      })
    }
  })

  const measureOperation = useCallback((operationName: string, fn: () => any) => {
    const startTime = performance.now()
    const result = fn()
    const duration = performance.now() - startTime

    if (duration > 50) {
      logger.warn('Slow operation detected', {
        component: componentName,
        operation: operationName,
        duration: Math.round(duration)
      })
    }

    return result
  }, [componentName, logger])

  return {
    renderCount: renderCountRef.current,
    measureOperation
  }
}

/**
 * Cache management hook
 */
export const useCache = () => {
  const cache = useEnhancedSelector(selectCache, {})

  const isCached = useCallback((key: string) => {
    return key in cache
  }, [cache])

  const isStale = useCallback((key: string) => {
    const entry = cache[key]
    if (!entry) return true
    return entry.isStale || (Date.now() - entry.lastFetched) > entry.ttl
  }, [cache])

  const getCacheAge = useCallback((key: string) => {
    const entry = cache[key]
    if (!entry) return null
    return Date.now() - entry.lastFetched
  }, [cache])

  return {
    cache,
    isCached,
    isStale,
    getCacheAge
  }
}