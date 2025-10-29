// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import AuthProvider from '@/components/auth/AuthProvider'

// Mock fetchCurrentUser thunk
const mockFetch = vi.fn(() => Promise.resolve())
vi.mock('@/store/slices/auth', () => ({
  fetchCurrentUser: () => mockFetch,
  setInitialized: () => ({ type: 'auth/setInitialized' })
}))

function makeStore(authState: any) {
  const reducer = {
    auth: () => authState,
  }
  return configureStore({ reducer })
}

describe('AuthProvider', () => {
  it('shows loading until initialized', () => {
    const store = makeStore({ user: null, isInitialized: false, isLoading: false })

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>child</div>
        </AuthProvider>
      </Provider>
    )

    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('renders children when initialized', () => {
    const store = makeStore({ user: null, isInitialized: true, isLoading: false })

    render(
      <Provider store={store}>
        <AuthProvider>
          <div>child</div>
        </AuthProvider>
      </Provider>
    )

    expect(screen.getByText('child')).toBeDefined()
  })
})
