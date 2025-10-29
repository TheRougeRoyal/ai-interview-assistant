import { persistReducer } from 'redux-persist'
import { combineReducers } from '@reduxjs/toolkit'
import localforage from 'localforage'
import createWebStorage from 'redux-persist/lib/storage/createWebStorage'

/**
 * Minimal localforage-like interface used by this file.
 * We avoid importing a non-existent `LocalForage` named export and only
 * declare the methods/properties we rely on at runtime.
 */
type LocalForageInstance = {
  getItem<T = any>(key: string): Promise<T | null>
  setItem<T = any>(key: string, value: T): Promise<T>
  removeItem(key: string): Promise<void>
  supports?(driver: string): boolean
  config?(opts: any): void
  INDEXEDDB?: string
  LOCALSTORAGE?: string
}

import sessionReducer from './slices/session'
import candidatesReducer from './slices/candidates'
import uiReducer from './slices/ui'

const isClient = typeof window !== 'undefined'

// Configuration flags for persistence behavior
const disablePersistenceFlag = process.env.DISABLE_PERSISTENCE === 'true'
const preferLocalStorageFlag = process.env.PREFER_LOCALSTORAGE === 'true'

// Create fallback storage using redux-persist's createWebStorage
const createWebFallbackStorage = (): PersistStorage => {
  if (!isClient) return createNoopStorage()
  
  try {
    const storage = createWebStorage('local')
    return storage
  } catch (error) {
    console.warn('Failed to create web storage, using noop storage:', error)
    return createNoopStorage()
  }
}

// Define the exact storage interface redux-persist expects
type PersistStorage = {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

const createNoopStorage = (): PersistStorage => ({
  // Provide async no-op storage so redux-persist can operate without errors
  async getItem(_key: string): Promise<string | null> {
    return null
  },
  async setItem(_key: string, _value: string): Promise<void> {
    return
  },
  async removeItem(_key: string): Promise<void> {
    return
  },
})

// Adapter to make LocalForage conform to redux-persist's expected storage interface
const createLocalForageAdapter = (lf: LocalForageInstance): PersistStorage => {
  return {
    async getItem(key: string): Promise<string | null> {
      const val = await lf.getItem<any>(key)
      if (val === null || val === undefined) return null
      // If stored value is a string, return as-is; otherwise serialize
      return typeof val === 'string' ? val : JSON.stringify(val)
    },
    async setItem(key: string, value: string): Promise<void> {
      // Store the string value directly; redux-persist expects void, so resolve after storing
      await lf.setItem(key, value)
    },
    async removeItem(key: string): Promise<void> {
      await lf.removeItem(key)
    },
  }
}

let shouldUsePersistence = false
let persistenceStorage: PersistStorage = createNoopStorage()

if (isClient && !disablePersistenceFlag) {
  if (preferLocalStorageFlag) {
    persistenceStorage = createWebFallbackStorage()
    shouldUsePersistence = true
  } else {
    try {
      const drivers: string[] = []
      if (localforage.supports(localforage.INDEXEDDB)) drivers.push(localforage.INDEXEDDB)
      if (localforage.supports(localforage.LOCALSTORAGE)) drivers.push(localforage.LOCALSTORAGE)

      if (drivers.length > 0) {
        localforage.config({
          name: 'ai-interview-assistant',
          storeName: 'app_state',
          description: 'Persistent state for AI Interview Assistant',
          driver: drivers,
        })
        // Use adapter instead of assigning localforage directly to match expected types
        persistenceStorage = createLocalForageAdapter(localforage)
        shouldUsePersistence = true
      } else {
        console.warn('localforage has no supported drivers, using localStorage fallback')
        persistenceStorage = createWebFallbackStorage()
        shouldUsePersistence = true
      }
    } catch (error) {
      console.warn('localforage init failed, using localStorage fallback:', error)
      persistenceStorage = createWebFallbackStorage()
      shouldUsePersistence = true
    }
  }
}

// Persistence configuration
const sessionPersistConfig = {
  key: 'session',
  storage: persistenceStorage,
  version: 1,
  migrate: (state: any) => {
    // Handle version migrations here if needed
    if (!state?.version) {
      return undefined // Reset to initial state if no version
    }
    return state
  },
}

const candidatesPersistConfig = {
  key: 'candidates',
  storage: persistenceStorage,
  version: 1,
  migrate: (state: any) => {
    if (!state?.version) {
      return undefined
    }
    return state
  },
}

const uiPersistConfig = {
  key: 'ui',
  storage: persistenceStorage,
  version: 1,
  blacklist: ['toasts'], // Don't persist toasts
  migrate: (state: any) => {
    if (!state?.version) {
      return undefined
    }
    return state
  },
}

// Create reducers (persisted or not based on environment)
const sessionReducerToUse = shouldUsePersistence ? persistReducer(sessionPersistConfig, sessionReducer) : sessionReducer
const candidatesReducerToUse = shouldUsePersistence ? persistReducer(candidatesPersistConfig, candidatesReducer) : candidatesReducer
const uiReducerToUse = shouldUsePersistence ? persistReducer(uiPersistConfig, uiReducer) : uiReducer

// Root reducer
export const rootReducer = combineReducers({
  session: sessionReducerToUse,
  candidates: candidatesReducerToUse,
  ui: uiReducerToUse,
})

export type RootState = ReturnType<typeof rootReducer>

export { shouldUsePersistence }
