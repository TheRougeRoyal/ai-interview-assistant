import { configureStore, combineReducers, createSlice, PayloadAction } from '@reduxjs/toolkit'
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
import type { PersistPartial } from 'redux-persist/es/persistReducer'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

// Migrations (increment version in persistConfig when adding)
const migrations = {
  0: (state: any) => ({ ...state })
}

// Determine if persistence is allowed (client only)
export const shouldUsePersistence = typeof window !== 'undefined'

// Create a storage that safely handles SSR
const createSafeStorage = () => {
  // During SSR, return a noop storage
  if (typeof window === 'undefined') {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
  }
  
  // On client, dynamically import and use localStorage
  try {
    // Import storage only on client side
    const storage = require('redux-persist/lib/storage').default
    return storage
  } catch {
    // Fallback to manual localStorage implementation
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

const safeStorage = createSafeStorage()

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 0,
  storage: safeStorage,
  // Don't persist authentication state to avoid immediately restoring
  // an authenticated user on page load (causes landing page redirects).
  // Persist only non-sensitive UI/session data.
  blacklist: ['auth'],
  migrate: createMigrate(migrations, {
    debug: process.env.NODE_ENV === 'development'
  })
}

// Base combined reducer

export interface ResumeState {
  fileName: string | null
  fileContent: string | null
  parsedData: {
    name?: string
    email?: string
    phone?: string
    experience?: string[]
    skills?: string[]
    education?: string[]
  } | null
  parseStatus: 'idle' | 'parsing' | 'success' | 'error'
  parseError: string | null
  confidence: number | null
  lastUpdated: number | null
}

const initialState: ResumeState = {
  fileName: null,
  fileContent: null,
  parsedData: null,
  parseStatus: 'idle',
  parseError: null,
  confidence: null,
  lastUpdated: null
}

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    setFile: (state: ResumeState, action: PayloadAction<{ fileName: string; content: string }>) => {
      state.fileName = action.payload.fileName
      state.fileContent = action.payload.content
      state.lastUpdated = Date.now()
    },
    setParsing: (state: ResumeState) => {
      state.parseStatus = 'parsing'
      state.parseError = null
    },
    setParsedData: (state: ResumeState, action: PayloadAction<{ 
      data: ResumeState['parsedData']
      confidence: number 
    }>) => {
      state.parsedData = action.payload.data
      state.confidence = action.payload.confidence
      state.parseStatus = 'success'
      state.parseError = null
      state.lastUpdated = Date.now()
    },
    setParseError: (state: ResumeState, action: PayloadAction<string>) => {
      state.parseStatus = 'error'
      state.parseError = action.payload
    },
    clearResume: () => {
      return initialState
    }
  }
})

export const {
  setFile,
  setParsing,
  setParsedData,
  setParseError,
  clearResume
} = resumeSlice.actions

import sessionReducer from './slices/session'
import authReducer from './slices/auth'
const combinedReducer = combineReducers({
  resume: resumeSlice.reducer,
  session: sessionReducer,
  auth: authReducer,
})

// Create rootReducer conditionally
let rootReducer: any

if (shouldUsePersistence) {
  rootReducer = persistReducer(persistConfig, combinedReducer)
} else {
  rootReducer = combinedReducer
}

export { rootReducer }

export const store = configureStore({
  reducer: rootReducer as any,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: shouldUsePersistence 
          ? [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
          : []
      }
    })
})

// Don't export the persistor directly, only provide a getter function
let persistorInstance: Persistor | null = null

export function getPersistor(): Persistor | null {
  // Only create persistor on client side when persistence is enabled
  if (typeof window === 'undefined' || !shouldUsePersistence) return null
  
  if (!persistorInstance) {
    try {
      persistorInstance = persistStore(store)
    } catch (error) {
      console.warn('Failed to create persistor:', error)
      return null
    }
  }
  
  return persistorInstance
}

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch
export type RootState = ReturnType<typeof store.getState>

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

