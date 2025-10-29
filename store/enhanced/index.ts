/**
 * Enhanced Redux store - Main export file
 */

// Store configuration and setup
export {
  enhancedStore,
  getEnhancedPersistor,
  initializeEnhancedStore,
  EnhancedStoreUtils,
  type EnhancedAppStore,
  type EnhancedAppDispatch,
  type EnhancedRootStateType
} from './store'

// Types
export type {
  EnhancedRootState,
  NormalizedEntities,
  EntityCollections,
  LoadingStates,
  ErrorStates,
  CandidateEntity,
  SessionEntity,
  AnswerEntity,
  UserEntity,
  ScoreEntity,
  OptimisticUpdate,
  UISelections,
  PaginationState,
  FilterState,
  EntityActionPayload,
  CollectionActionPayload,
  OptimisticActionPayload,
  EntitySelector,
  CollectionSelector,
  LoadingSelector,
  ErrorSelector
} from './types'

// Entity actions
export {
  // Candidate actions
  setCandidates,
  addCandidate,
  updateCandidate,
  removeCandidate,
  
  // Session actions
  setSessions,
  addSession,
  updateSession,
  removeSession,
  
  // Answer actions
  setAnswers,
  addAnswer,
  updateAnswer,
  removeAnswer,
  
  // User actions
  setUsers,
  addUser,
  updateUser,
  removeUser,
  
  // Score actions
  setScores,
  addScore,
  updateScore,
  removeScore,
  
  // Collection actions
  setCollection,
  addToCollection,
  removeFromCollection,
  reorderCollection,
  clearCollection,
  clearAllCollections,
  
  // Optimistic update actions
  addOptimisticUpdate,
  removeOptimisticUpdate,
  clearOptimisticUpdates,
  revertOptimisticUpdate,
  
  // Batch operations
  batchUpdateEntities,
  clearEntities
} from './entities'

// UI actions
export {
  // Loading actions
  setLoadingState,
  clearAllLoading,
  
  // Error actions
  setErrorState,
  clearErrorState,
  clearAllErrors,
  
  // UI actions
  setSelections,
  selectCandidate,
  deselectCandidate,
  clearCandidateSelection,
  setCurrentCandidate,
  setCurrentSession,
  setPagination,
  updatePagination,
  setFilters,
  setCandidateFilters,
  setSessionFilters,
  clearFilters,
  setTheme,
  setModal,
  closeAllModals,
  addToast,
  removeToast,
  clearToasts,
  resetUI,
  
  // Cache actions
  setCacheMetadata,
  markCacheStale,
  clearCache,
  clearAllCache
} from './ui'

// Selectors
export {
  // Base selectors
  selectEntities,
  selectCollections,
  selectLoading,
  selectErrors,
  selectUI,
  selectCache,
  selectOptimistic,
  
  // Entity selectors
  selectCandidates,
  selectSessions,
  selectAnswers,
  selectUsers,
  selectScores,
  
  // Individual entity selectors
  selectCandidateById,
  selectSessionById,
  selectAnswerById,
  selectUserById,
  selectScoreById,
  
  // Collection selectors
  selectCandidateList,
  selectSessionList,
  selectAnswerList,
  selectUserList,
  selectScoreList,
  
  // Denormalized selectors
  selectCandidateWithSessions,
  selectSessionWithAnswers,
  selectAnswerWithScores,
  
  // Filtered selectors
  selectFilteredCandidates,
  selectFilteredSessions,
  
  // Loading selectors
  selectCandidatesLoading,
  selectCandidateCreating,
  selectSessionsLoading,
  selectAuthLoading,
  
  // Error selectors
  selectCandidatesError,
  selectCandidateCreateError,
  selectSessionsError,
  selectAuthError,
  selectGlobalError,
  
  // UI selectors
  selectSelectedCandidates,
  selectCurrentCandidate,
  selectCurrentSession,
  
  // Cache selectors
  selectCacheMetadata,
  selectIsStale,
  
  // Statistics selectors
  selectCandidateStats,
  selectSessionStats,
  
  // Optimistic selectors
  selectOptimisticUpdates,
  selectOptimisticUpdatesByEntity
} from './selectors'

// Integration layer
export {
  // Async thunks
  fetchCandidates,
  createCandidate,
  updateCandidateById,
  fetchSessions,
  createSession,
  updateSessionById,
  fetchAnswers,
  createAnswer,
  updateAnswerById,
  syncSessionWithNormalizedState,
  
  // Utility functions
  migrateLegacyState
} from './integration'

// Enhanced hooks
export {
  useEnhancedDispatch,
  useEnhancedSelector,
  useCandidates,
  useSessions,
  useCurrentCandidate,
  useCurrentSession,
  useOptimisticUpdates,
  useAutoSync,
  useErrorHandler,
  usePerformanceMonitor,
  useCache
} from './hooks'

// API client
export {
  EnhancedApiClient,
  apiClient,
  createApiClient,
  ApiUtils,
  type ApiClientConfig,
  type RequestOptions,
  type ApiResponse
} from './apiClient'

// Persistence
export {
  StatePersistenceManager,
  persistenceManager,
  createPersistenceMiddleware,
  type PersistenceConfig
} from './persistence'

// Middleware
export {
  optimisticUpdatesMiddleware,
  errorHandlingMiddleware,
  persistenceMiddleware,
  cacheInvalidationMiddleware,
  correlationMiddleware,
  performanceMiddleware,
  enhancedMiddleware
} from './middleware'

/**
 * Utility functions for store setup and management
 */
export const EnhancedStoreSetup = {
  /**
   * Initialize the enhanced store with proper error handling
   */
  async initialize() {
    try {
      const { store, persistor } = await initializeEnhancedStore()
      
      // Set up error boundaries
      if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason)
          store.dispatch(addToast({
            type: 'error',
            message: 'An unexpected error occurred'
          }))
        })
      }
      
      return { store, persistor }
    } catch (error) {
      console.error('Failed to initialize enhanced store:', error)
      throw error
    }
  },

  /**
   * Clean up store resources
   */
  async cleanup() {
    const persistor = getEnhancedPersistor()
    if (persistor) {
      await persistor.flush()
    }
  },

  /**
   * Reset store to initial state
   */
  reset() {
    EnhancedStoreUtils.dispatch(clearEntities())
    EnhancedStoreUtils.dispatch(clearAllCollections())
    EnhancedStoreUtils.dispatch(clearAllLoading())
    EnhancedStoreUtils.dispatch(clearAllErrors())
    EnhancedStoreUtils.dispatch(resetUI())
    EnhancedStoreUtils.dispatch(clearAllCache())
    EnhancedStoreUtils.dispatch(clearOptimisticUpdates())
  },

  /**
   * Get store health information
   */
  getHealth() {
    const state = EnhancedStoreUtils.getState()
    const persistor = getEnhancedPersistor()
    
    return {
      storeInitialized: !!state,
      persistorInitialized: !!persistor,
      entitiesCount: {
        candidates: Object.keys(state.entities?.candidates || {}).length,
        sessions: Object.keys(state.entities?.sessions || {}).length,
        answers: Object.keys(state.entities?.answers || {}).length,
        users: Object.keys(state.entities?.users || {}).length,
        scores: Object.keys(state.entities?.scores || {}).length
      },
      optimisticUpdatesCount: state.optimistic?.length || 0,
      cacheEntriesCount: Object.keys(state.cache || {}).length,
      hasErrors: !!(
        state.errors?.global ||
        Object.values(state.errors?.candidates || {}).some(Boolean) ||
        Object.values(state.errors?.sessions || {}).some(Boolean) ||
        Object.values(state.errors?.answers || {}).some(Boolean) ||
        Object.values(state.errors?.auth || {}).some(Boolean)
      )
    }
  }
}

/**
 * Development utilities (only available in development)
 */
export const EnhancedStoreDev = process.env.NODE_ENV === 'development' ? {
  /**
   * Log current state
   */
  logState() {
    console.log('Enhanced Store State:', EnhancedStoreUtils.getState())
  },

  /**
   * Log store health
   */
  logHealth() {
    console.log('Enhanced Store Health:', EnhancedStoreSetup.getHealth())
  },

  /**
   * Simulate error for testing
   */
  simulateError(message: string = 'Test error') {
    EnhancedStoreUtils.dispatch(setErrorState({
      category: 'global' as any,
      error: {
        code: 'TEST_ERROR',
        message,
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString(),
        details: { test: true }
      }
    }))
  },

  /**
   * Clear all errors
   */
  clearErrors() {
    EnhancedStoreUtils.dispatch(clearAllErrors())
  }
} : undefined