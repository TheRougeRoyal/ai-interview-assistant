import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

import sessionReducer from './slices/session'
import candidatesReducer from './slices/candidates'
import uiReducer from './slices/ui'

// Test store without persistence
export const testStore = configureStore({
  reducer: {
    session: sessionReducer,
    candidates: candidatesReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for tests
    }),
})

export type TestRootState = ReturnType<typeof testStore.getState>
export type TestAppDispatch = typeof testStore.dispatch

// Typed hooks for test
export const useTestDispatch = () => useDispatch<TestAppDispatch>()
export const useTestSelector: TypedUseSelectorHook<TestRootState> = useSelector

// Note: don't re-export TestRootState by type alias to avoid conflicts
