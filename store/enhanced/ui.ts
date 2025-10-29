/**
 * Enhanced UI state management with loading, errors, and selections
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  LoadingStates,
  ErrorStates,
  UISelections,
  PaginationState,
  FilterState
} from './types'
import type { ApiError } from '@/lib/errors'

/**
 * Initial loading states
 */
const initialLoadingState: LoadingStates = {
  candidates: {
    list: false,
    create: false,
    update: false,
    delete: false,
    search: false
  },
  sessions: {
    list: false,
    create: false,
    update: false,
    delete: false
  },
  answers: {
    create: false,
    update: false,
    delete: false
  },
  auth: {
    login: false,
    register: false,
    logout: false,
    refresh: false
  }
}

/**
 * Initial error states
 */
const initialErrorState: ErrorStates = {
  candidates: {
    list: null,
    create: null,
    update: null,
    delete: null,
    search: null
  },
  sessions: {
    list: null,
    create: null,
    update: null,
    delete: null
  },
  answers: {
    create: null,
    update: null,
    delete: null
  },
  auth: {
    login: null,
    register: null,
    logout: null,
    refresh: null
  },
  global: null
}

/**
 * Initial UI selections
 */
const initialSelectionsState: UISelections = {
  selectedCandidateIds: [],
  selectedSessionIds: [],
  selectedAnswerIds: [],
  currentCandidateId: null,
  currentSessionId: null
}

/**
 * Initial filter state
 */
const initialFilterState: FilterState = {
  candidates: {
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    filters: {}
  },
  sessions: {
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    filters: {}
  }
}

/**
 * Initial UI state
 */
const initialUIState = {
  selections: initialSelectionsState,
  pagination: {} as Record<string, PaginationState>,
  filters: initialFilterState,
  theme: 'system' as 'light' | 'dark' | 'system',
  modals: {} as Record<string, boolean>,
  toasts: [] as Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    timestamp: number
  }>
}

/**
 * Loading state slice
 */
export const loadingSlice = createSlice({
  name: 'loading',
  initialState: initialLoadingState,
  reducers: {
    setLoadingState: (state, action: PayloadAction<{
      category: keyof LoadingStates
      operation: string
      loading: boolean
    }>) => {
      const { category, operation, loading } = action.payload
      if (state[category] && operation in state[category]) {
        (state[category] as any)[operation] = loading
      }
    },
    
    clearAllLoading: (state) => {
      Object.keys(state).forEach(category => {
        Object.keys((state as any)[category]).forEach(operation => {
          (state as any)[category][operation] = false
        })
      })
    }
  }
})

/**
 * Error state slice
 */
export const errorSlice = createSlice({
  name: 'errors',
  initialState: initialErrorState,
  reducers: {
    setErrorState: (state, action: PayloadAction<{
      category: keyof ErrorStates
      operation?: string
      error: ApiError
    }>) => {
      const { category, operation, error } = action.payload
      
      if (category === 'global') {
        state.global = error
      } else if (operation && state[category] && operation in state[category]) {
        (state[category] as any)[operation] = error
      }
    },
    
    clearErrorState: (state, action: PayloadAction<{
      category: keyof ErrorStates
      operation?: string
    }>) => {
      const { category, operation } = action.payload
      
      if (category === 'global') {
        state.global = null
      } else if (operation && state[category] && operation in state[category]) {
        (state[category] as any)[operation] = null
      }
    },
    
    clearAllErrors: (state) => {
      state.global = null
      Object.keys(state).forEach(category => {
        if (category !== 'global') {
          Object.keys((state as any)[category]).forEach(operation => {
            (state as any)[category][operation] = null
          })
        }
      })
    }
  }
})

/**
 * UI state slice
 */
export const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUIState,
  reducers: {
    // Selection management
    setSelections: (state, action: PayloadAction<Partial<UISelections>>) => {
      state.selections = { ...state.selections, ...action.payload }
    },
    
    selectCandidate: (state, action: PayloadAction<string>) => {
      if (!state.selections.selectedCandidateIds.includes(action.payload)) {
        state.selections.selectedCandidateIds.push(action.payload)
      }
    },
    
    deselectCandidate: (state, action: PayloadAction<string>) => {
      state.selections.selectedCandidateIds = state.selections.selectedCandidateIds
        .filter(id => id !== action.payload)
    },
    
    clearCandidateSelection: (state) => {
      state.selections.selectedCandidateIds = []
    },
    
    setCurrentCandidate: (state, action: PayloadAction<string | null>) => {
      state.selections.currentCandidateId = action.payload
    },
    
    setCurrentSession: (state, action: PayloadAction<string | null>) => {
      state.selections.currentSessionId = action.payload
    },
    
    // Pagination management
    setPagination: (state, action: PayloadAction<{
      key: string
      pagination: PaginationState
    }>) => {
      const { key, pagination } = action.payload
      state.pagination[key] = pagination
    },
    
    updatePagination: (state, action: PayloadAction<{
      key: string
      updates: Partial<PaginationState>
    }>) => {
      const { key, updates } = action.payload
      if (state.pagination[key]) {
        state.pagination[key] = { ...state.pagination[key], ...updates }
      }
    },
    
    // Filter management
    setFilters: (state, action: PayloadAction<{
      entity: keyof FilterState
      filters: Partial<FilterState[keyof FilterState]>
    }>) => {
      const { entity, filters } = action.payload
      state.filters[entity] = { ...state.filters[entity], ...filters }
    },
    
    setCandidateFilters: (state, action: PayloadAction<Partial<FilterState['candidates']>>) => {
      state.filters.candidates = { ...state.filters.candidates, ...action.payload }
    },
    
    setSessionFilters: (state, action: PayloadAction<Partial<FilterState['sessions']>>) => {
      state.filters.sessions = { ...state.filters.sessions, ...action.payload }
    },
    
    clearFilters: (state, action: PayloadAction<keyof FilterState>) => {
      const entity = action.payload
      if (entity === 'candidates') {
        state.filters.candidates = initialFilterState.candidates
      } else if (entity === 'sessions') {
        state.filters.sessions = initialFilterState.sessions
      }
    },
    
    // Theme management
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
    },
    
    // Modal management
    setModal: (state, action: PayloadAction<{
      modalId: string
      open: boolean
    }>) => {
      const { modalId, open } = action.payload
      state.modals[modalId] = open
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modalId => {
        state.modals[modalId] = false
      })
    },
    
    // Toast management
    addToast: (state, action: PayloadAction<{
      type: 'success' | 'error' | 'warning' | 'info'
      message: string
    }>) => {
      const { type, message } = action.payload
      const toast = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: Date.now()
      }
      state.toasts.push(toast)
    },
    
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload)
    },
    
    clearToasts: (state) => {
      state.toasts = []
    },
    
    // Bulk operations
    resetUI: (state) => {
      state.selections = initialSelectionsState
      state.pagination = {}
      state.filters = initialFilterState
      state.modals = {}
      state.toasts = []
    }
  }
})

/**
 * Cache slice for metadata management
 */
export const cacheSlice = createSlice({
  name: 'cache',
  initialState: {} as Record<string, {
    lastFetched: number
    isStale: boolean
    ttl: number
  }>,
  reducers: {
    setCacheMetadata: (state, action: PayloadAction<{
      key: string
      lastFetched: number
      ttl: number
    }>) => {
      const { key, lastFetched, ttl } = action.payload
      state[key] = {
        lastFetched,
        isStale: false,
        ttl
      }
    },
    
    markCacheStale: (state, action: PayloadAction<string>) => {
      const key = action.payload
      if (state[key]) {
        state[key].isStale = true
      }
    },
    
    clearCache: (state, action: PayloadAction<string>) => {
      delete state[action.payload]
    },
    
    clearAllCache: () => {
      return {}
    }
  }
})

// Export actions
export const {
  setLoadingState,
  clearAllLoading
} = loadingSlice.actions

export const {
  setErrorState,
  clearErrorState,
  clearAllErrors
} = errorSlice.actions

export const {
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
  resetUI
} = uiSlice.actions

export const {
  setCacheMetadata,
  markCacheStale,
  clearCache,
  clearAllCache
} = cacheSlice.actions

// Export reducers
export const loadingReducer = loadingSlice.reducer
export const errorReducer = errorSlice.reducer
export const uiReducer = uiSlice.reducer
export const cacheReducer = cacheSlice.reducer