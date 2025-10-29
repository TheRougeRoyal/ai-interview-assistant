/**
 * Enhanced Redux store with normalized state and comprehensive middleware
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createMigrate
} from 'redux-persist'
import type { Persistor } from 'redux-persist'


import {
  entitiesReducer,
  collectionsReducer,
  optimisticReducer
} from './entities'
import {
  loadingReducer,
  errorReducer,
  uiReducer,
  cacheReducer
} from './ui'
import { enhancedMiddleware } from './middleware'

// Legacy reducers for backward compatibility
import authReducer from '../slices/auth'
import sessionReducer from '../slices/session'
import { rootReducer as legacyRootReducer } from '../index'

/**
 * State migrations for version upgrades
 */
const migrations = {
  0: (state: any) => state,
  1: (state: any) => ({
    ...state,
    // Migration from legacy to enhanced state structure
    entities: state.entities || {
      candidates: {},
      sessions: {},
      answers: {},
      users: {},
      scores: {}
    },
    collections: state.collections || {
      candidateIds: [],
      sessionIds: [],
      answerIds: [],
      userIds: [],
      scoreIds: []
    }
  })
}

/**
 * Create safe storage for SSR compatibility
 */
const createSafeStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
  }
  
  try {
    const storage = require('redux-persist/lib/storage').default
    return storage
  } catch {
    return {
      getItem: (key: string) => {
        try {
          return Promise.resolve(window.localStorage.getItem(key))
        } catch {
          return Promise.resolve(null)
        }
      },
      setItem: (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value)
          return Promise.resolve()
        } catch {
          return Promise.resolve()
        }
      },
      removeItem: (key: string) => {
        try {
          window.localStorage.removeItem(key)
          return Promise.resolve()
        } catch {
          return Promise.resolve()
        }
      },
    }
  }
}

/**
 * Persistence configuration
 */
const persistConfig = {
  key: 'enhanced-root',
  version: 1,
  storage: createSafeStorage(),
  // Persist UI preferences and cache, but not sensitive data
  whitelist: ['ui', 'cache'],
  blacklist: ['entities', 'collections', 'loading', 'errors', 'optimistic', 'legacy'],
  migrate: createMigrate(migrations, {
    debug: process.env.NODE_ENV === 'development'
  })
}

/**
 * Enhanced root reducer
 */
const enhancedRootReducer = combineReducers({
  entities: entitiesReducer,
  collections: collectionsReducer,
  loading: loadingReducer,
  errors: errorReducer,
  ui: uiReducer,
  cache: cacheReducer,
  optimistic: optimisticReducer,
  // Legacy state for backward compatibility
  legacy: combineReducers({
    auth: authReducer,
    session: sessionReducer,
    resume: legacyRootReducer // This includes the resume slice
  })
})

/**
 * Create persisted reducer
 */
const persistedReducer = typeof window !== 'undefined' 
  ? persistReducer(persistConfig, enhancedRootReducer) as any
  : enhancedRootReducer

/**
 * Enhanced store configuration
 */
export const enhancedStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionsPaths: ['meta.correlationId', 'payload.timestamp'],
        ignoredPaths: ['optimistic', 'cache']
      },
      immutableCheck: {
        ignoredPaths: ['optimistic', 'cache']
      }
    }).concat(enhancedMiddleware as any),
  devTools: process.env.NODE_ENV !== 'production' && {
    name: 'AI Interview Assistant - Enhanced',
    trace: true,
    traceLimit: 25
  }
})

/**
 * Enhanced persistor
 */
let enhancedPersistorInstance: Persistor | null = null

export function getEnhancedPersistor(): Persistor | null {
  if (typeof window === 'undefined') return null
  
  if (!enhancedPersistorInstance) {
    try {
      enhancedPersistorInstance = persistStore(enhancedStore)
    } catch (error) {
      console.warn('Failed to create enhanced persistor:', error)
      return null
    }
  }
  
  return enhancedPersistorInstance
}

/**
 * Enhanced store types
 */
export type EnhancedAppStore = typeof enhancedStore
export type EnhancedAppDispatch = typeof enhancedStore.dispatch
export type EnhancedRootStateType = ReturnType<typeof enhancedStore.getState>

/**
 * Enhanced typed hooks
 */
export const useEnhancedDispatch: () => EnhancedAppDispatch = useDispatch
export const useEnhancedSelector: TypedUseSelectorHook<EnhancedRootStateType> = useSelector

/**
 * Store utilities
 */
export const EnhancedStoreUtils = {
  /**
   * Get current state
   */
  getState(): EnhancedRootStateType {
    return enhancedStore.getState()
  },

  /**
   * Dispatch action
   */
  dispatch(action: any) {
    return enhancedStore.dispatch(action)
  },

  /**
   * Subscribe to store changes
   */
  subscribe(listener: () => void) {
    return enhancedStore.subscribe(listener)
  },

  /**
   * Get persistor
   */
  getPersistor() {
    return getEnhancedPersistor()
  },

  /**
   * Purge persisted state
   */
  async purge() {
    const persistor = getEnhancedPersistor()
    if (persistor) {
      await persistor.purge()
    }
  },

  /**
   * Flush persisted state
   */
  async flush() {
    const persistor = getEnhancedPersistor()
    if (persistor) {
      await persistor.flush()
    }
  }
}

/**
 * Store initialization utility
 */
export async function initializeEnhancedStore(): Promise<{
  store: EnhancedAppStore
  persistor: Persistor | null
}> {
  const persistor = getEnhancedPersistor()
  
  // Wait for rehydration if persistor exists
  if (persistor) {
    return new Promise((resolve) => {
      const unsubscribe = persistor.subscribe(() => {
        const { bootstrapped } = persistor.getState()
        if (bootstrapped) {
          unsubscribe()
          resolve({ store: enhancedStore, persistor })
        }
      })
    })
  }
  
  return { store: enhancedStore, persistor: null }
}

/**
 * Development utilities
 */
if (process.env.NODE_ENV === 'development') {
  // Expose store to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__ENHANCED_REDUX_STORE__ = enhancedStore
    (window as any).__ENHANCED_STORE_UTILS__ = EnhancedStoreUtils
  }
}